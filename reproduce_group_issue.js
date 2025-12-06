import connectDb from './lib/db.js';
import Group from './models/Group.js';
import mongoose from 'mongoose';

async function test() {
  try {
    console.log('Connecting to DB...');
    await connectDb();
    console.log('Connected to DB');

    // Fetch groups with the same query as the API
    const groups = await Group.find({
      $or: [
        { is_public: true },
        { is_public: { $exists: false } }
      ]
    });
    
    console.log(`Found ${groups.length} groups`);
    groups.forEach(g => {
        console.log(`- ${g.name} (public: ${g.is_public}, id: ${g._id})`);
    });

    // Check if we can create a group
    // const newGroup = await Group.create({
    //   name: 'Test Group ' + Date.now(),
    //   description: 'Test Description',
    //   is_public: true
    // });
    // console.log('Created group:', newGroup);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
