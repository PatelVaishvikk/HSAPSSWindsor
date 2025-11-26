import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import io from 'socket.io-client';

let socket;

export default function GroupsView({ student, portalAuthHeaders }) {
  const [activeTab, setActiveTab] = useState('my-groups'); // 'my-groups', 'discover', 'chat'
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', icon: 'users' });
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef(null);

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
    
    // Initialize socket
    socket = io();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup._id);
      socket.emit('group:join', { groupId: selectedGroup._id });

      socket.on('group:message', (newMessage) => {
        if (newMessage.group === selectedGroup._id) {
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      });

      return () => {
        socket.emit('group:leave', { groupId: selectedGroup._id });
        socket.off('group:message');
      };
    }
  }, [selectedGroup]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student-portal/groups', { headers: portalAuthHeaders });
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (groupId) => {
    try {
      const res = await fetch(`/api/student-portal/groups/${groupId}/messages`, { headers: portalAuthHeaders });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/student-portal/groups', {
        method: 'POST',
        headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroupData)
      });
      const data = await res.json();
      if (data.group) {
        setGroups(prev => [data.group, ...prev]); // Add to list but don't assume structure match perfectly yet
        setShowCreateModal(false);
        setNewGroupData({ name: '', description: '', icon: 'users' });
        fetchGroups(); // Refresh to get full structure
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinToggle = async (group) => {
    try {
      const res = await fetch(`/api/student-portal/groups/${group._id}/join`, {
        method: 'POST',
        headers: portalAuthHeaders
      });
      const data = await res.json();
      if (data.success) {
        fetchGroups(); // Refresh list
        if (selectedGroup && selectedGroup._id === group._id && !data.joined) {
          setSelectedGroup(null); // Deselect if left
          setActiveTab('my-groups');
        }
      }
    } catch (error) {
      console.error('Error joining/leaving group:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/messages`, {
        method: 'POST',
        headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText })
      });
      
      if (res.ok) {
        setMessageText('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/invite`, {
        method: 'POST',
        headers: portalAuthHeaders
      });
      const data = await res.json();
      if (data.success) {
        setInviteCode(data.invite_code);
        // Update local group data
        setSelectedGroup(prev => ({ ...prev, invite_code: data.invite_code }));
      }
    } catch (error) {
      console.error('Error generating invite:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addMemberEmail.trim()) return;
    setAddMemberLoading(true);
    try {
      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/add-member`, {
        method: 'POST',
        headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailToAdd: addMemberEmail })
      });
      const data = await res.json();
      if (data.success) {
        alert('Member added successfully!');
        setAddMemberEmail('');
        fetchGroups(); // Refresh to update member count/list
      } else {
        alert(data.message || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error adding member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const myGroups = groups.filter(g => g.isMember);
  const otherGroups = groups.filter(g => !g.isMember);

  if (selectedGroup) {
    return (
      <div className="h-100 d-flex flex-column bg-white rounded-4 shadow-sm overflow-hidden" style={{ maxHeight: '85vh' }}>
        {/* Chat Header */}
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light">
          <div className="d-flex align-items-center gap-3 cursor-pointer" onClick={() => setShowInfoModal(true)}>
            <Button variant="light" size="sm" className="rounded-circle" onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); }}>
              <i className="fas fa-arrow-left"></i>
            </Button>
            <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 40, height: 40 }}>
              <i className={`fas fa-${selectedGroup.icon || 'users'} text-primary`}></i>
            </div>
            <div>
              <h6 className="fw-bold mb-0">{selectedGroup.name}</h6>
              <small className="text-muted">{selectedGroup.memberCount} members</small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="light" size="sm" onClick={() => setShowInfoModal(true)}>
                <i className="fas fa-info-circle text-primary"></i>
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-grow-1 p-3 overflow-auto custom-scrollbar" style={{ backgroundColor: '#f8f9fa' }}>
          {messages.length === 0 ? (
            <div className="text-center text-muted mt-5">
              <div className="mb-3 opacity-50"><i className="fas fa-comments fa-3x"></i></div>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isSelf = msg.sender._id === student._id;
              const showHeader = idx === 0 || messages[idx - 1].sender._id !== msg.sender._id;
              
              return (
                <div key={msg._id || idx} className={`d-flex flex-column mb-2 ${isSelf ? 'align-items-end' : 'align-items-start'}`}>
                  {showHeader && !isSelf && (
                    <small className="text-muted ms-1 mb-1" style={{ fontSize: '0.75rem' }}>
                      {msg.sender.first_name} {msg.sender.last_name}
                    </small>
                  )}
                  <div 
                    className={`p-3 rounded-4 shadow-sm ${isSelf ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                    style={{ 
                      maxWidth: '75%', 
                      borderBottomRightRadius: isSelf ? 4 : 16,
                      borderBottomLeftRadius: !isSelf ? 4 : 16
                    }}
                  >
                    {msg.content}
                  </div>
                  <small className="text-muted mt-1 opacity-75" style={{ fontSize: '0.65rem' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-top">
          <Form onSubmit={handleSendMessage}>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="rounded-pill bg-light border-0 px-4"
                autoFocus
              />
              <Button 
                type="submit" 
                variant="primary" 
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: 46, height: 46 }}
                disabled={!messageText.trim()}
              >
                <i className="fas fa-paper-plane"></i>
              </Button>
            </div>
          </Form>
          {/* Mobile Spacer */}
          <div className="d-lg-none" style={{ height: 80 }}></div>
        </div>

        {/* Group Info Modal */}
        <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="fw-bold">Group Info</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="text-center mb-4">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 80, height: 80, fontSize: '2rem' }}>
                        <i className={`fas fa-${selectedGroup.icon || 'users'}`}></i>
                    </div>
                    <h4 className="fw-bold">{selectedGroup.name}</h4>
                    <p className="text-muted">{selectedGroup.description}</p>
                </div>

                <div className="mb-4">
                    <h6 className="fw-bold mb-3">Invite Link</h6>
                    <div className="p-3 bg-light rounded-3">
                        {selectedGroup.invite_code ? (
                            <div>
                                <div className="d-flex gap-2 mb-2">
                                    <Form.Control 
                                        readOnly 
                                        value={`${window.location.origin}/student-portal?invite=${selectedGroup.invite_code}`} 
                                        className="bg-white"
                                    />
                                    <Button variant="outline-primary" onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/student-portal?invite=${selectedGroup.invite_code}`);
                                        alert('Link copied!');
                                    }}>
                                        <i className="fas fa-copy"></i>
                                    </Button>
                                </div>
                                <Button variant="link" className="text-danger p-0 small" onClick={handleGenerateInvite} disabled={inviteLoading}>
                                    Reset Link
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="small text-muted mb-2">No invite link generated yet.</p>
                                <Button variant="outline-primary" size="sm" onClick={handleGenerateInvite} disabled={inviteLoading}>
                                    {inviteLoading ? <Spinner size="sm" animation="border" /> : 'Generate Invite Link'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    <h6 className="fw-bold mb-3">Add Member</h6>
                    <Form onSubmit={handleAddMember} className="d-flex gap-2">
                        <Form.Control 
                            placeholder="Enter Student ID" 
                            value={addMemberId}
                            onChange={(e) => setAddMemberId(e.target.value)}
                        />
                        <Button type="submit" variant="primary" disabled={addMemberLoading}>
                            {addMemberLoading ? <Spinner size="sm" animation="border" /> : 'Add'}
                        </Button>
                    </Form>
                    <small className="text-muted">Enter the unique Student ID to add them directly.</small>
                </div>
                
                <div className="d-grid">
                    <Button variant="outline-danger" onClick={() => {
                        handleJoinToggle(selectedGroup);
                        setShowInfoModal(false);
                    }}>
                        Leave Group
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 h-100">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Groups</h2>
          <p className="text-muted mb-0">Join communities and chat with peers.</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus me-2"></i> Create Group
        </Button>
      </div>

      <div className="d-flex gap-2 mb-4 overflow-auto pb-2">
        <Button 
          variant={activeTab === 'my-groups' ? 'dark' : 'light'} 
          className="rounded-pill px-4"
          onClick={() => setActiveTab('my-groups')}
        >
          My Groups
        </Button>
        <Button 
          variant={activeTab === 'discover' ? 'dark' : 'light'} 
          className="rounded-pill px-4"
          onClick={() => setActiveTab('discover')}
        >
          Discover
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <div className="row g-4">
          {(activeTab === 'my-groups' ? myGroups : otherGroups).map(group => (
            <div key={group._id} className="col-md-6 col-xl-4">
              <Card className="h-100 border-0 shadow-sm hover-scale transition-all cursor-pointer" onClick={() => {
                if (group.isMember) setSelectedGroup(group);
              }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
                      <i className={`fas fa-${group.icon || 'users'}`}></i>
                    </div>
                    {group.isMember ? (
                      <Badge bg="success" className="rounded-pill">Member</Badge>
                    ) : (
                      <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={(e) => {
                        e.stopPropagation();
                        handleJoinToggle(group);
                      }}>
                        Join
                      </Button>
                    )}
                  </div>
                  <h5 className="fw-bold mb-2">{group.name}</h5>
                  <p className="text-muted small mb-3 line-clamp-2">{group.description || 'No description provided.'}</p>
                  <div className="d-flex align-items-center text-muted small">
                    <i className="fas fa-user-friends me-2"></i>
                    {group.memberCount} members
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
          {(activeTab === 'my-groups' ? myGroups : otherGroups).length === 0 && (
            <div className="col-12 text-center py-5 text-muted">
              <div className="mb-3 opacity-50"><i className="fas fa-search fa-3x"></i></div>
              <p>No groups found. {activeTab === 'my-groups' ? 'Join one from the Discover tab!' : 'Create one to get started!'}</p>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Create New Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateGroup}>
            <Form.Group className="mb-3">
              <Form.Label>Group Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., Computer Science 2025"
                value={newGroupData.name}
                onChange={e => setNewGroupData({...newGroupData, name: e.target.value})}
                required 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                placeholder="What is this group about?"
                value={newGroupData.description}
                onChange={e => setNewGroupData({...newGroupData, description: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Icon</Form.Label>
              <div className="d-flex gap-3 flex-wrap">
                {['users', 'code', 'book', 'coffee', 'gamepad', 'music', 'graduation-cap'].map(icon => (
                  <div 
                    key={icon}
                    className={`rounded-circle d-flex align-items-center justify-content-center cursor-pointer border ${newGroupData.icon === icon ? 'bg-primary text-white border-primary' : 'bg-light text-muted border-light'}`}
                    style={{ width: 40, height: 40, cursor: 'pointer' }}
                    onClick={() => setNewGroupData({...newGroupData, icon})}
                  >
                    <i className={`fas fa-${icon}`}></i>
                  </div>
                ))}
              </div>
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="light" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? <Spinner size="sm" animation="border" /> : 'Create Group'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
