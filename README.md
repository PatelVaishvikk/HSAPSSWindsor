# HSAPSS Windsor - Student Management & Community Platform

A comprehensive Next.js-based student management system for the Hindu Swayamsevak Sangh (HSS) Windsor chapter. This platform provides student tracking, community networking, attendance management, call logs, and analytics capabilities.

## 🌟 Features

### 📱 Student Portal
- **Secure Authentication**: Phone-based login with custom password support
- **Profile Management**: Comprehensive student profiles with academic and personal information
- **Community Networking**: Connect with other students, follow/unfollow, and build your network
- **Real-time Messaging**: Direct messaging with typing indicators and online presence
- **Help Board**: Request and offer help within the community
- **Study Sync**: Collaborative study groups and learning paths
- **Digital Library**: Access shared resources and educational materials
- **Analytics Dashboard**: Personal insights on engagement, growth, and influence

### 👥 Admin Features
- **Student Management**: Add, edit, and track student information
- **Attendance Tracking**: Record and analyze attendance patterns
- **Call Logs**: Track communication with students
- **Grocery Management**: Manage sabha grocery items
- **Analytics Engine**: Comprehensive analytics for student engagement and activities
- **Group Management**: Create and manage student groups

### 🎨 Customization
- **7 Theme Options**: Cyberpunk, Ocean, Sunset, Forest, Aurora, Light, and Dark themes
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Updates**: Socket.IO integration for live notifications and messaging

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.9.0 (required for Next.js 16)
- **MongoDB**: Database for storing student and application data
- **npm**: Package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PatelVaishvikk/HSAPSSWindsor.git
   cd HSAPSSWindsor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NODE_ENV=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
HSAPSSWindsor/
├── components/          # React components
│   ├── AnalyticsDashboard.js
│   ├── DashboardStats.js
│   ├── GroupsView.js
│   ├── StudySyncView.js
│   ├── DigitalLibrary.js
│   └── ...
├── config/             # Configuration files
├── data/               # Static data files
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── analytics-engine.js
│   └── studentPortalAuth.js
├── models/             # MongoDB models
│   ├── Student.js
│   ├── Attendance.js
│   ├── CallLog.js
│   ├── Group.js
│   └── ...
├── pages/              # Next.js pages
│   ├── api/           # API routes
│   ├── admin/         # Admin pages
│   ├── student-portal.js
│   ├── attendance.js
│   ├── call-logs.js
│   └── ...
├── public/            # Static assets
├── styles/            # CSS styles
└── middleware.js      # Next.js middleware
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 18, Bootstrap 5, React Bootstrap
- **Backend**: Node.js, Express, Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Charts**: Chart.js, React-Chartjs-2
- **Styling**: Tailwind CSS, Bootstrap, Custom CSS
- **Authentication**: Custom phone-based authentication with bcrypt
- **Forms**: Formidable for file uploads
- **Search**: Fuse.js for fuzzy search

## 🔑 Key Components

### Student Portal (`/student-portal`)
- Personal dashboard with feed, community, inbox, and help board
- Profile editing with academic and career information
- Networking features with follow/unfollow functionality
- Real-time messaging and notifications

### Admin Dashboard (`/admin/dashboard`)
- Overview statistics and analytics
- Quick access to student management
- Call logs and attendance tracking

### Attendance System (`/attendance`)
- Record student attendance
- View attendance history and patterns
- Generate attendance reports

### Call Logs (`/call-logs`)
- Track all communications with students
- Filter and search call history
- Analytics on call patterns

## 📊 Analytics Engine

The platform includes a sophisticated analytics engine (`lib/analytics-engine.js`) that provides:

- **Personal Analytics**: Engagement scores, activity trends, profile completeness
- **Growth Metrics**: Network growth, connection velocity, projections
- **Content Performance**: Post engagement, best posting times
- **Influence Metrics**: Community impact, helpfulness scores
- **Time Investment**: ROI on platform engagement

## 🔐 Authentication

The platform uses a custom phone-based authentication system:

1. Students register with their phone number
2. Create a secure password
3. Login using phone + password
4. Session management with secure headers

## 🌐 API Routes

### Student Portal APIs
- `POST /api/student-portal/login` - Student login
- `POST /api/student-portal/register` - Student registration
- `GET /api/student-portal/profile` - Get student profile
- `PUT /api/student-portal/profile` - Update profile
- `GET /api/student-portal/community` - Get community members
- `POST /api/student-portal/follow` - Follow/unfollow users
- `GET /api/student-portal/notifications` - Get notifications
- `GET /api/student-portal/help-requests` - Get help board requests

### Admin APIs
- Student CRUD operations
- Attendance management
- Call log management
- Analytics data retrieval

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly**
   ```bash
   npm run dev
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add: your feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Test your changes before submitting
- Update documentation as needed
- Ensure responsive design for all UI changes

## 📝 License

This project is private and maintained for the HSS Windsor community.

## 👨‍💻 Maintainers

- **Vaishvik Patel** - [@PatelVaishvikk](https://github.com/PatelVaishvikk)

## 🐛 Known Issues

- Node.js version requirement (>= 20.9.0) may cause issues with older versions
- Some deprecated packages (see npm warnings during installation)

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the maintainers.

## 🙏 Acknowledgments

Built with ❤️ for the HSS Windsor community to enhance student engagement and management.

---

**Note**: This is an active development project. Features and documentation are continuously being updated.
