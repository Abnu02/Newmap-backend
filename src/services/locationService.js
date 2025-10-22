const prisma = require('../config/database');
const axios = require('axios');
const config = require('../config');

class LocationService {
  // Save location update from employee
  async saveLocationUpdate(employeeId, locationData) {
    try {
      // Reverse geocode the address
      const address = await this.reverseGeocode(locationData.latitude, locationData.longitude);
      
      // Save location record
      const location = await prisma.location.create({
        data: {
          employeeId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          altitude: locationData.altitude,
          speed: locationData.speed,
          heading: locationData.heading,
          battery: locationData.battery,
          address,
          timestamp: locationData.timestamp || new Date()
        }
      });

      // Update presence
      await this.updatePresence(employeeId, true);

      return location;
    } catch (error) {
      console.error('Error saving location update:', error);
      throw error;
    }
  }

  // Update employee presence
  async updatePresence(employeeId, isOnline) {
    try {
      await prisma.presence.upsert({
        where: { employeeId },
        update: {
          isOnline,
          lastSeenAt: new Date()
        },
        create: {
          employeeId,
          isOnline,
          lastSeenAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating presence:', error);
      throw error;
    }
  }

  // Get latest location for an employee
  async getLatestLocation(employeeId) {
    try {
      const location = await prisma.location.findFirst({
        where: { employeeId },
        orderBy: { timestamp: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              department: true,
              avatarUrl: true
            }
          }
        }
      });

      return location;
    } catch (error) {
      console.error('Error getting latest location:', error);
      throw error;
    }
  }

  // Get location history for an employee
  async getLocationHistory(employeeId, options = {}) {
    try {
      const { from, to, limit = 100 } = options;
      
      const where = { employeeId };
      
      if (from || to) {
        where.timestamp = {};
        if (from) where.timestamp.gte = new Date(from);
        if (to) where.timestamp.lte = new Date(to);
      }

      const locations = await prisma.location.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              department: true
            }
          }
        }
      });

      return locations;
    } catch (error) {
      console.error('Error getting location history:', error);
      throw error;
    }
  }

  // Get all employees with their latest locations and presence
  async getAllEmployeesWithLocations(search = '', page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      
      const where = {
        isActive: true,
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip,
          take: limit,
          include: {
            presence: true,
            locations: {
              take: 1,
              orderBy: { timestamp: 'desc' }
            }
          },
          orderBy: { fullName: 'asc' }
        }),
        prisma.employee.count({ where })
      ]);

      return {
        employees,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting employees with locations:', error);
      throw error;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(config.nominatimApiUrl + '/reverse', {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 18,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'Newmap-Backend/1.0'
        }
      });

      if (response.data && response.data.display_name) {
        return response.data.display_name;
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Mark employees as offline if they haven't updated in a while
  async markInactiveEmployeesOffline() {
    try {
      const timeoutDate = new Date(Date.now() - config.presenceTimeoutMs);
      
      await prisma.presence.updateMany({
        where: {
          isOnline: true,
          lastSeenAt: { lt: timeoutDate }
        },
        data: {
          isOnline: false
        }
      });
    } catch (error) {
      console.error('Error marking inactive employees offline:', error);
    }
  }
}

module.exports = new LocationService();
