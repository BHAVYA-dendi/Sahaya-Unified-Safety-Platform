# SAHAYA Backend

SAHAYA National Safety Platform - Node.js/Express Backend with MongoDB

## Features

- **Authentication**: JWT-based login/register with bcrypt password hashing
- **User Management**: Complete registration with profile, address, emergency contacts
- **SOS System**: Create alerts with GPS coordinates, recordings, track status
- **Family Management**: Add/track children and elderly family members
- **File Uploads**: Profile photos, Aadhaar cards, recordings (Multer)
- **Portal Access**: Role-based access to Women/Child/Elderly/Disaster/Health

## Quick Start

### Prerequisites

- Node.js (v16+)
- MongoDB (local or Atlas)

### Installation

```bash
# Install dependencies
npm install

# Or with nodemon for development
npm install -g nodemon
npm install
```

### Environment Variables

Edit `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sahaya
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

For MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sahaya
```

### Run Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |
| PUT | `/api/user/portals` | Update selected portals |
| PUT | `/api/user/emergency-contacts` | Update emergency contacts |
| PUT | `/api/user/photos` | Update photo URLs |
| DELETE | `/api/user` | Deactivate account |

### SOS Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sos/alert` | Create SOS alert |
| GET | `/api/sos/alerts` | Get alert history |
| GET | `/api/sos/active` | Get active alerts |
| PUT | `/api/sos/resolve/:id` | Resolve alert |
| PUT | `/api/sos/cancel/:id` | Cancel alert |
| PUT | `/api/sos/recording/:id` | Update recording URL |

### Family Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/family` | Add family member |
| GET | `/api/family` | Get all members |
| GET | `/api/family/:id` | Get single member |
| PUT | `/api/family/:id` | Update member |
| PUT | `/api/family/:id/location` | Update location |
| PUT | `/api/family/:id/status` | Update status |
| PUT | `/api/family/:id/activity` | Update activity |
| DELETE | `/api/family/:id` | Remove member |

### File Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/profile` | Upload profile photo |
| POST | `/api/upload/aadhaar` | Upload Aadhaar card |
| POST | `/api/upload/family` | Upload family member photo |
| POST | `/api/upload/recording` | Upload SOS recording |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status |

## Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Frontend Integration

Update frontend `script.js` to use API endpoints:
- Replace `localStorage` with API calls
- Store JWT token after login
- Include token in all requests

## Database Models

### User
- Personal details (name, DOB, gender)
- Address (house, street, city, state, pin)
- Contact (phone, email, password)
- Identity (Aadhaar, medical info)
- Emergency contacts array
- Selected portals array

### SOSAlert
- User reference
- GPS coordinates
- Status (active/resolved/cancelled)
- Recording URL
- Contacts notified

### FamilyMember
- Parent reference
- Type (child/elderly)
- Personal details
- Safe zone (for children)
- Health info (for elderly)
- Location tracking
