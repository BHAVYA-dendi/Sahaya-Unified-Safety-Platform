# SAHAYA - National Safety Platform

A comprehensive safety platform for Women, Children, Elderly, Disaster Management, and Health Emergency.

## Project Structure

```
safety-app/
├── index.html              # Main SPA with auth, registration, dashboard
├── dashboard.html          # Standalone dashboard page
├── women.html             # Women Safety Portal
├── child.html             # Child Safety Portal
├── elderly.html           # Elderly Safety Portal
├── disaster.html          # Disaster Management Portal
├── family.html            # Family Management
├── script.js              # Frontend JavaScript with API integration
├── styles.css             # Application styles
├── sahaya-logo.png        # Logo assets
├── light-logo.png
├── backend/               # Node.js/Express Backend
│   ├── server.js          # Main server file
│   ├── package.json       # Dependencies
│   ├── .env              # Environment variables
│   ├── models/            # MongoDB models
│   │   ├── User.js
│   │   ├── SOSAlert.js
│   │   └── FamilyMember.js
│   ├── routes/            # API routes
│   │   ├── auth.js        # Login/Register
│   │   ├── user.js        # Profile management
│   │   ├── sos.js         # SOS alerts
│   │   ├── family.js      # Family management
│   │   └── upload.js      # File uploads
│   ├── middleware/        # Auth & upload middleware
│   │   ├── auth.js
│   │   └── upload.js
│   └── uploads/           # Uploaded files storage
└── README.md             # This file
```

## Quick Start

### 1. Install MongoDB

**Option A: Local MongoDB**
- Download and install MongoDB Community Server: https://www.mongodb.com/try/download/community
- Start MongoDB service

**Option B: MongoDB Atlas (Cloud)**
- Create free cluster at https://www.mongodb.com/atlas
- Get connection string and update `backend/.env`

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Start server
npm start

# Or for development with auto-reload
npm run dev
```

Server will run on `http://localhost:5000`

### 3. Open Frontend

Open `index.html` directly in browser or use a local server:

```bash
# Using Python 3
python -m http.server 8080

# Or using Node.js npx
npx serve ..
```

Then open `http://localhost:8080`

## Features

### Authentication
- User registration (6-step process)
- JWT-based login
- Profile management

### Safety Portals
- **Women Safety**: SOS alerts, video recording, fake calls, safe routes
- **Child Safety**: Location tracking, geofencing, activity monitoring
- **Elderly Safety**: Fall detection, health monitoring, medication reminders
- **Disaster Management**: Emergency alerts, shelter locator, evacuation routes
- **Health Emergency**: Medical SOS, hospital finder

### Emergency Features
- **SOS Button**: 5-second countdown with location sharing
- **Video Recording**: Automatic recording during emergencies
- **Emergency Contacts**: SMS/call notifications
- **Real-time Location**: GPS tracking with Google Maps integration

### Family Management
- Add children and elderly family members
- Track locations and status
- Safe zone alerts
- Activity monitoring for children

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### User
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `PUT /api/user/portals` - Update portals
- `PUT /api/user/emergency-contacts` - Update contacts
- `DELETE /api/user` - Delete account

### SOS
- `POST /api/sos/alert` - Create alert
- `GET /api/sos/alerts` - Get history
- `PUT /api/sos/resolve/:id` - Resolve alert

### Family
- `POST /api/family` - Add member
- `GET /api/family` - Get members
- `PUT /api/family/:id` - Update member
- `DELETE /api/family/:id` - Remove member

### Upload
- `POST /api/upload/profile` - Upload profile photo
- `POST /api/upload/aadhaar` - Upload Aadhaar

## Environment Variables

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sahaya
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

## Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8080 | http://localhost:8080 |
| Backend API | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

## Testing

1. Open frontend in browser
2. Click "New Registration"
3. Complete all 6 steps
4. Login with registered credentials
5. Test SOS button (press for 2 seconds)
6. Navigate through different portals

## Tech Stack

### Frontend
- HTML5
- CSS3 (custom styles)
- JavaScript (vanilla)
- Font Awesome icons
- Google Fonts (Poppins)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- Multer file uploads

## Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify `.env` file exists with correct MONGODB_URI
- Check port 5000 is not in use

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check CORS is enabled in server.js
- Check browser console for errors

### Login not working
- Clear browser localStorage
- Check network tab for API errors
- Verify JWT token is being stored

## Security Notes

- JWT tokens are stored in localStorage
- Passwords are hashed with bcrypt
- File uploads are limited to images (5MB max)
- CORS is enabled for all origins (configure for production)
- MongoDB should use authentication in production

## License

This project is for educational purposes.

## Support

For issues or questions, check the backend README at `backend/README.md`
