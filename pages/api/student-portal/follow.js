import dbConnect from '../../../lib/dbConnect';
import Student from '../../../models/Student';
import { getPortalSessionFromRequest } from '../../../lib/studentPortalAuth';
import { toObjectId } from '../../../lib/studentPortalUtils';
import Notification from '../../../models/Notification';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const session = await getPortalSessionFromRequest(req, res);
    if (!session || !session.student) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { targetId, action } = req.body;
    const viewerId = session.student._id;
    const targetObjectId = toObjectId(targetId);

    if (!targetObjectId) {
      return res.status(400).json({ error: 'Invalid target student' });
    }

    if (viewerId.toString() === targetObjectId.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const viewer = await Student.findById(viewerId);
    const target = await Student.findById(targetObjectId);

    if (!viewer || !target) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Initialize arrays
    if (!viewer.following) viewer.following = [];
    if (!viewer.followRequests) viewer.followRequests = [];
    if (!target.followers) target.followers = [];
    if (!target.followRequests) target.followRequests = [];

    const io = global?.io;
    const viewerName = `${viewer.first_name} ${viewer.last_name}`;
    const targetName = `${target.first_name} ${target.last_name}`;

    if (action === 'follow') {
      // Direct follow (Instant)
      if (!viewer.following.includes(targetObjectId)) {
        viewer.following.push(targetObjectId);
      }
      if (!target.followers.includes(viewerId)) {
        target.followers.push(viewerId);
      }
      
      // Remove from requests if present
      viewer.followRequests = viewer.followRequests.filter(id => id.toString() !== targetObjectId.toString());
      target.followRequests = target.followRequests.filter(id => id.toString() !== viewerId.toString());

      await Promise.all([viewer.save(), target.save()]);

      // Create Notification
      await Notification.create({
        recipient: targetObjectId,
        sender: viewerId,
        type: 'follow_request', // Using same type for simplicity or 'new_follower'
        title: 'New Follower',
        message: `${viewerName} started following you`,
        data: { userId: viewerId.toString(), userName: viewerName }
      });

      // Notify target
      if (io) {
        io.to(`student:${targetId}`).emit('notification', {
          title: 'New Follower',
          message: `${viewerName} started following you`,
          variant: 'success',
          icon: 'user-plus',
          timestamp: new Date()
        });
        
        io.to(`student:${targetId}`).emit('follow_update', {
          followerId: viewerId,
          targetId: targetId,
          action: 'follow',
          followerName: viewerName // Useful for UI
        });
      }

      return res.status(200).json({ success: true, message: 'Followed successfully' });
    }

    if (action === 'request') {
      // Send follow request
      if (!target.followRequests.includes(viewerId)) {
        target.followRequests.push(viewerId);
        await target.save();

      // Create Notification
      await Notification.create({
        recipient: targetObjectId,
        sender: viewerId,
        type: 'follow_request',
        title: 'Follow Request',
        message: `${viewerName} wants to follow you`,
        data: { userId: viewerId.toString(), userName: viewerName }
      });

      // Emit notification to target
      if (io) {
        io.to(`student:${targetObjectId.toString()}`).emit('follow_request', {
          userId: viewerId.toString(),
          userName: viewerName,
          message: `${viewerName} wants to follow you`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return res.status(200).json({ 
      success: true, 
      status: 'requested'
    });

  } else if (action === 'accept') {
    // Accept follow request (viewer is accepting a request from target)
    if (viewer.followRequests.includes(targetObjectId)) {
      // Remove from requests
      viewer.followRequests = viewer.followRequests.filter(
        id => id.toString() !== targetObjectId.toString()
      );
      
      // Add to followers/following
      if (!viewer.followers.includes(targetObjectId)) {
        viewer.followers.push(targetObjectId);
      }
      if (!target.following.includes(viewerId)) {
        target.following.push(viewerId);
      }

      await viewer.save();
      await target.save();

      // Create Notification
      await Notification.create({
        recipient: targetObjectId,
        sender: viewerId,
        type: 'follow_accept',
        title: 'Request Accepted',
        message: `${viewerName} accepted your follow request`,
        data: { userId: viewerId.toString(), userName: viewerName }
      });

      // Emit notifications
      if (io) {
        io.to(`student:${targetObjectId.toString()}`).emit('follow_accepted', {
          userId: viewerId.toString(),
          userName: viewerName,
          message: `${viewerName} accepted your follow request`,
          timestamp: new Date().toISOString()
        });
      }
      }

      return res.status(200).json({ 
        success: true,
        followerCount: viewer.followers.length,
        followingCount: target.following.length
      });

    } else if (action === 'reject') {
      // Reject follow request
      if (viewer.followRequests.includes(targetObjectId)) {
        viewer.followRequests = viewer.followRequests.filter(
          id => id.toString() !== targetObjectId.toString()
        );
        await viewer.save();
      }

      return res.status(200).json({ 
        success: true
      });

    } else if (action === 'unfollow') {
      // Remove following/follower relationship
      viewer.following = viewer.following.filter(
        id => id.toString() !== targetObjectId.toString()
      );
      target.followers = target.followers.filter(
        id => id.toString() !== viewerId.toString()
      );

      // Also remove from followRequests (cancel request)
      target.followRequests = target.followRequests.filter(
        id => id.toString() !== viewerId.toString()
      );
      viewer.followRequests = viewer.followRequests.filter(
        id => id.toString() !== targetObjectId.toString()
      );

      await viewer.save();
      await target.save();

      // Create Notification
      await Notification.create({
        recipient: targetObjectId,
        sender: viewerId,
        type: 'unfollow',
        title: 'Lost Follower',
        message: `${viewerName} unfollowed you`,
        data: { userId: viewerId.toString(), userName: viewerName }
      });

      if (io) {
        io.to(`student:${viewerId.toString()}`).emit('follow_update', {
          type: 'unfollow',
          targetId: targetObjectId.toString(),
          followingCount: viewer.following.length
        });
        
        io.to(`student:${targetObjectId.toString()}`).emit('follow_update', {
          type: 'lost_follower',
          userId: viewerId.toString(),
          followerCount: target.followers.length
        });

        // Emit notification to target
        io.to(`student:${targetObjectId.toString()}`).emit('notification', {
          title: 'Lost Follower',
          message: `${viewerName} unfollowed you`,
          variant: 'warning',
          icon: 'user-minus',
          timestamp: new Date()
        });
      }

      return res.status(200).json({ 
        success: true, 
        status: 'unfollowed',
        followerCount: target.followers.length,
        followingCount: viewer.following.length
      });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Follow API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
