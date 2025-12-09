# Local Server Setup Guide - HSAPSS Windsor

## Quick Start

Follow these steps to run the project on your local server:

### Step 1: Create Environment File

Create a file named `.env.local` in the project root with the following content:

```env
MONGODB_URI=your_mongodb_connection_string_here
NODE_ENV=development
```

### Step 2: Get MongoDB Connection String

You have three options:

#### Option A: MongoDB Atlas (Recommended - Free Cloud Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new cluster (free tier M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<database>` with `hsapss-windsor`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hsapss-windsor?retryWrites=true&w=majority
```

#### Option B: Local MongoDB

If you have MongoDB installed locally:
```
MONGODB_URI=mongodb://localhost:27017/hsapss-windsor
```

To install MongoDB locally (macOS):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Option C: Use Existing Connection

If you already have a MongoDB connection string, use that.

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start Development Server

```bash
npm run dev
```

The server will start at: **http://localhost:3000**

### Step 5: Access the Application

- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **Student Portal**: http://localhost:3000/student-portal
- **Admin Login**: http://localhost:3000/admin/login

---

## Troubleshooting

### Error: "MONGODB_URI is not defined"
- Make sure you created `.env.local` file (not `.env.example`)
- Verify the file is in the project root directory
- Check that `MONGODB_URI` is spelled correctly

### Error: "MongoServerError: bad auth"
- Check your MongoDB username and password
- Make sure you've whitelisted your IP address in MongoDB Atlas

### Port Already in Use
If port 3000 is already in use:
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Quick Command Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check environment variables
node check-env.js
```

---

## Next Steps After Setup

1. ✅ Server running at http://localhost:3000
2. 🎨 See the new modern design with educational theme
3. 🔍 Test the navbar with orange/saffron gradients
4. 📱 Check responsive design on different screen sizes
5. ✨ Explore glassmorphism effects and animations

Enjoy your modernized HSAPSS Windsor platform! 🚀
