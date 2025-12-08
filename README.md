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
├── components/              # React components
│   ├── AINetworkingPanel.js
│   ├── AnalyticsDashboard.js
│   ├── BirthdayReminder.js
│   ├── Chart.js
│   ├── ChatBot.js
│   ├── ChatWidget.js
│   ├── DarkModeToggle.js
│   ├── DashboardStats.js
│   ├── DigitalLibrary.js
│   ├── GroupsView.js
│   ├── Modal.js
│   ├── Navbar.js
│   ├── OpportunityFeed.js
│   ├── RecentCalls.js
│   ├── SkillVerificationWidget.js
│   └── StudySyncView.js
│
├── config/                  # Configuration files
│   ├── db.js               # Database configuration
│   └── studentPortalFields.js
│
├── data/                    # Static data files
│   └── librarySeed.js      # Library seed data
│
├── hooks/                   # Custom React hooks
│   └── useFeed.js          # Feed management hook
│
├── lib/                     # Utility libraries
│   ├── adminAuth.js        # Admin authentication
│   ├── adminPage.js
│   ├── adminRoute.js
│   ├── ai-engine.js        # AI functionality engine
│   ├── analytics-engine.js # Analytics processing
│   ├── db.js               # Database utilities
│   ├── dbConnect.js        # MongoDB connection
│   ├── portalAdmin.js
│   ├── portalSession.js    # Session management
│   ├── studentPortalAuth.js # Student authentication
│   └── studentPortalUtils.js
│
├── models/                  # MongoDB Mongoose models
│   ├── Achievement.js
│   ├── Attendance.js
│   ├── CallLog.js
│   ├── Comment.js
│   ├── CommunityMessage.js
│   ├── GroceryItem.js
│   ├── Group.js
│   ├── GroupMessage.js
│   ├── HelpRequest.js
│   ├── LearningPath.js
│   ├── Notification.js
│   ├── Opportunity.js
│   ├── Portfolio.js
│   ├── Post.js
│   ├── Resource.js
│   ├── SabhaGrocery.js
│   ├── Skill.js
│   ├── Student.js
│   ├── StudyProfile.js
│   └── Workspace.js
│
├── pages/                   # Next.js pages and routing
│   ├── admin/              # Admin dashboard pages
│   │   ├── dashboard.js
│   │   └── login.js
│   │
│   ├── api/                # API routes
│   │   ├── admin/         # Admin API endpoints
│   │   │   ├── login.js
│   │   │   ├── logout.js
│   │   │   └── session.js
│   │   │
│   │   ├── ai/            # AI-related endpoints
│   │   │   ├── conversation-starter.js
│   │   │   └── networking.js
│   │   │
│   │   ├── analytics/     # Analytics endpoints
│   │   │   └── personal.js
│   │   │
│   │   ├── attendance/    # Attendance management
│   │   │   └── dates.js
│   │   │
│   │   ├── notifications/ # Notification system
│   │   │   └── birthdays.js
│   │   │
│   │   ├── opportunities/ # Opportunity management
│   │   │   ├── [oppId]/   # Dynamic opportunity routes
│   │   │   └── index.js
│   │   │
│   │   ├── student-portal/ # Student portal APIs
│   │   │   ├── groups/
│   │   │   │   ├── [id]/
│   │   │   │   ├── index.js
│   │   │   │   └── join-via-link.js
│   │   │   ├── resources/
│   │   │   │   └── seed.js
│   │   │   ├── study-sync/
│   │   │   │   ├── matches.js
│   │   │   │   └── profile.js
│   │   │   ├── community.js
│   │   │   ├── follow.js
│   │   │   ├── followers.js
│   │   │   ├── help-requests.js
│   │   │   ├── login.js
│   │   │   ├── logout.js
│   │   │   ├── messages.js
│   │   │   ├── notifications.js
│   │   │   ├── password.js
│   │   │   ├── post-actions.js
│   │   │   ├── posts.js
│   │   │   ├── register.js
│   │   │   ├── update.js
│   │   │   └── upload-profile-picture.js
│   │   │
│   │   ├── students/      # Student CRUD operations
│   │   │   └── [id].js    # Dynamic student routes
│   │   │
│   │   ├── attendance.js
│   │   ├── call-logs.js
│   │   ├── chat.js
│   │   ├── dashboard-stats.js
│   │   ├── grocery.js
│   │   ├── sabha-grocery.js
│   │   ├── students.js
│   │   └── whatsapp.js
│   │
│   ├── 404.js              # Custom 404 page
│   ├── _app.js             # Next.js app wrapper
│   ├── _document.js        # Custom document
│   ├── add-student.js      # Add student page
│   ├── add-yuvak.js        # Add yuvak page
│   ├── attendance.js       # Attendance tracking
│   ├── call-logs.js        # Call logs management
│   ├── chat.js
│   ├── full-student-list.js
│   ├── grocery.js          # Grocery management
│   ├── index.js            # Home page
│   ├── login.js            # Login page
│   ├── moved-out-students.js
│   ├── student-portal.js   # Main student portal
│   └── students-table.js   # Student table view
│
├── public/                  # Static assets
│   ├── images/             # Image assets
│   │   ├── favicon.png.jpg
│   │   └── loader.gif
│   ├── profile-pics/       # Student profile pictures
│   ├── styles/             # Public stylesheets (HTML files)
│   ├── hs.jpg
│   ├── windsor.jpg
│   ├── add-yuvak.html
│   ├── call-logs-table.html
│   ├── round.html
│   ├── students-table.html
│   ├── test-login.html
│   └── *.svg               # SVG icons (file.svg, globe.svg, next.svg, vercel.svg, window.svg)
│
├── styles/                  # CSS stylesheets
│   ├── Attendance.module.css
│   ├── global.css
│   ├── globals.css
│   └── professional-theme.css
│
├── middleware.js            # Next.js middleware
├── server.js               # Custom Express server with Socket.IO
├── next.config.mjs         # Next.js configuration
├── tailwind.config.mjs     # Tailwind CSS configuration
├── postcss.config.mjs      # PostCSS configuration
├── eslint.config.mjs       # ESLint configuration
├── jsconfig.json           # JavaScript configuration
├── package.json            # Dependencies and scripts
└── .gitignore              # Git ignore rules
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
