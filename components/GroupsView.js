import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, Modal, Spinner, Badge, Dropdown } from 'react-bootstrap';
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
  const [addMemberEmail, setAddMemberEmail] = useState('');
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

      socket.on('group:chat_cleared', () => {
        setMessages([]);
      });

      socket.on('group:deleted', () => {
        alert('This group has been deleted by an admin.');
        setSelectedGroup(null);
        fetchGroups();
      });

      socket.on('group:member_updated', () => {
        fetchGroups(); // Refresh list to update member counts/admins
        // Also refresh selected group details if we are viewing it
        // We can just call fetchGroups which updates 'groups' state, 
        // but we need to update 'selectedGroup' state too if it's the one modified.
        // Since 'selectedGroup' is a separate state object, we should probably re-fetch it or sync it.
        // Actually, let's just re-fetch the specific group details or rely on fetchGroups updating the list 
        // and then we might need to update selectedGroup from the new list.
        // For simplicity, let's just re-fetch all groups and update selectedGroup if it exists in the new list.
      });

      return () => {
        socket.emit('group:leave', { groupId: selectedGroup._id });
        socket.off('group:message');
        socket.off('group:chat_cleared');
        socket.off('group:deleted');
        socket.off('group:member_updated');
      };
    }
  }, [selectedGroup]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      console.log('[GroupsView] Fetching groups...');
      const res = await fetch('/api/student-portal/groups', { headers: portalAuthHeaders });
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);

        // If we have a selected group, update its data from the new list
        // Use a functional state update to ensure we check against the latest selectedGroup if needed,
        // but here we are inside the function scope. 
        // Better to check the current 'selectedGroup' state.
        if (selectedGroup) {
          const updatedGroup = data.groups.find(g => g._id === selectedGroup._id);
          if (updatedGroup) {
            console.log('[GroupsView] Updating selected group:', updatedGroup.name);
            setSelectedGroup(updatedGroup);
          }
        }
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
    if (!portalAuthHeaders) {
      alert("Authentication missing. Please try refreshing the page.");
      return;
    }

    console.log('[GroupsView] Toggling join for:', group._id);
    try {
      const res = await fetch(`/api/student-portal/groups/${group._id}/join`, {
        method: 'POST',
        headers: portalAuthHeaders
      });
      const data = await res.json();
      console.log('[GroupsView] Join result:', data);

      if (data.success) {
        if (data.status === 'requested') {
          alert("Join request sent! Waiting for admin approval.");
          // Optimistically update UI
          const updatedGroup = { ...group, hasRequested: true };
          // Update in list
          setGroups(prev => prev.map(g => g._id === group._id ? updatedGroup : g));
        } else if (data.joined === false) {
          // Left group
          if (selectedGroup && selectedGroup._id === group._id) {
            setSelectedGroup(null); // Deselect if left
            setActiveTab('my-groups'); // Go back to main list
          }
          await fetchGroups();
        }
      } else {
        alert(data.error || "Failed to join group.");
      }
    } catch (error) {
      console.error('Error joining/leaving group:', error);
      alert("An error occurred while trying to join the group.");
    }
  };

  const JoinRequestsList = ({ groupId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/student-portal/groups/${groupId}/requests`, { headers: portalAuthHeaders });
        const data = await res.json();
        setRequests(data.requests || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };

    useEffect(() => {
      fetchRequests();
    }, [groupId]);

    const handleAction = async (requesterId, action) => {
      try {
        const res = await fetch(`/api/student-portal/groups/${groupId}/requests`, {
          method: 'POST',
          headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requesterId, action })
        });
        if (res.ok) {
          fetchRequests();
          fetchGroups(); // Refresh main list to update member counts
        }
      } catch (e) { console.error(e); }
    };

    if (loading) return <div className="text-center"><Spinner size="sm" /></div>;
    if (requests.length === 0) return <div className="text-muted small fst-italic">No pending requests.</div>;

    return (
      <div className="d-flex flex-column gap-2">
        {requests.map(req => (
          <div key={req._id} className="d-flex align-items-center justify-content-between p-2 bg-surface rounded-3 border border-warning">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                <span className="small fw-bold">{req.first_name?.[0]}{req.last_name?.[0]}</span>
              </div>
              <div>
                <div className="fw-bold small">{req.first_name} {req.last_name}</div>
                <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{req.mail_id}</div>
              </div>
            </div>
            <div className="d-flex gap-1">
              <Button variant="success" size="sm" className="py-0 px-2" onClick={() => handleAction(req._id, 'approve')}>
                <i className="fas fa-check"></i>
              </Button>
              <Button variant="danger" size="sm" className="py-0 px-2" onClick={() => handleAction(req._id, 'reject')}>
                <i className="fas fa-times"></i>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
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
      <div className="h-100 d-flex flex-column bg-surface rounded-4 shadow-sm overflow-hidden" style={{ maxHeight: '85vh' }}>
        {/* Chat Header */}
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-surface">
          <div className="d-flex align-items-center gap-3 cursor-pointer" onClick={() => setShowInfoModal(true)}>
            <Button variant="light" size="sm" className="rounded-circle" onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); }}>
              <i className="fas fa-arrow-left"></i>
            </Button>
            <div className="bg-surface rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 40, height: 40 }}>
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
        <div className="flex-grow-1 p-3 overflow-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-body)' }}>
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
                    className={`p-3 rounded-4 shadow-sm ${isSelf ? 'bg-primary text-white' : 'bg-surface text-main'}`}
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
        <div className="p-3 bg-surface border-top">
          <Form onSubmit={handleSendMessage}>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="rounded-pill bg-surface border-0 px-4"
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
              <div className="p-3 bg-surface rounded-3">
                {selectedGroup.invite_code ? (
                  <div>
                    <div className="d-flex gap-2 mb-2">
                      <Form.Control
                        readOnly
                        value={`${window.location.origin}/student-portal?invite=${selectedGroup.invite_code}`}
                        className="bg-surface"
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
                  placeholder="Enter Student Email"
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                />
                <Button type="submit" variant="primary" disabled={addMemberLoading}>
                  {addMemberLoading ? <Spinner size="sm" animation="border" /> : 'Add'}
                </Button>
              </Form>
              <small className="text-muted">Enter their email address to add them directly.</small>
            </div>

            <div className="mb-4">
              <h6 className="fw-bold mb-3">Members ({selectedGroup.members?.length || 0})</h6>
              <div className="d-flex flex-column gap-2">
                {selectedGroup.members && selectedGroup.members.map(member => {
                  if (!member) return null; // Safety check
                  const isAdmin = selectedGroup.admins && selectedGroup.admins.includes(member._id);
                  const isMe = member._id === student._id;
                  const amIAdmin = selectedGroup.admins && selectedGroup.admins.includes(student._id);

                  return (
                    <div key={member._id} className="d-flex align-items-center justify-content-between p-2 bg-surface rounded-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                          {member.profile_picture ? (
                            <img src={member.profile_picture} alt="" className="w-100 h-100 rounded-circle object-fit-cover" />
                          ) : (
                            <span className="small fw-bold">{member.first_name?.[0]}{member.last_name?.[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold small">{member.first_name} {member.last_name}</span>
                            {isAdmin && <Badge bg="success" style={{ fontSize: '0.6rem' }}>Admin</Badge>}
                            {isMe && <Badge bg="secondary" style={{ fontSize: '0.6rem' }}>You</Badge>}
                          </div>
                          <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{member.mail_id || 'No email'}</div>
                        </div>
                      </div>

                      {amIAdmin && !isMe && (
                        <Dropdown>
                          <Dropdown.Toggle variant="link" className="text-muted p-0 no-caret">
                            <i className="fas fa-ellipsis-v"></i>
                          </Dropdown.Toggle>
                          <Dropdown.Menu align="end">
                            {isAdmin ? (
                              <Dropdown.Item onClick={async () => {
                                if (confirm(`Demote ${member.first_name} from Admin?`)) {
                                  try {
                                    const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/manage-member`, {
                                      method: 'POST',
                                      headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ memberId: member._id, action: 'demote' })
                                    });
                                    if (res.ok) fetchGroups();
                                  } catch (e) { console.error(e); }
                                }
                              }}>Dismiss as Admin</Dropdown.Item>
                            ) : (
                              <Dropdown.Item onClick={async () => {
                                if (confirm(`Make ${member.first_name} a Group Admin?`)) {
                                  try {
                                    const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/manage-member`, {
                                      method: 'POST',
                                      headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ memberId: member._id, action: 'promote' })
                                    });
                                    if (res.ok) fetchGroups();
                                  } catch (e) { console.error(e); }
                                }
                              }}>Make Group Admin</Dropdown.Item>
                            )}
                            <Dropdown.Divider />
                            <Dropdown.Item className="text-danger" onClick={async () => {
                              if (confirm(`Remove ${member.first_name} from the group?`)) {
                                try {
                                  const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/manage-member`, {
                                    method: 'DELETE',
                                    headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ memberId: member._id })
                                  });
                                  if (res.ok) fetchGroups();
                                } catch (e) { console.error(e); }
                              }
                            }}>Remove from Group</Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Actions */}
            {selectedGroup.admins && selectedGroup.admins.includes(student._id) && (
              <div className="d-grid gap-2 mt-4 pt-3 border-top">
                <Button variant="outline-danger" onClick={async () => {
                  if (confirm('Are you sure you want to clear the entire chat history? This cannot be undone.')) {
                    try {
                      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/messages`, {
                        method: 'DELETE',
                        headers: portalAuthHeaders
                      });
                      if (res.ok) {
                        setMessages([]);
                        alert('Chat cleared successfully');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Failed to clear chat');
                    }
                  }
                }}>
                  <i className="fas fa-trash-alt me-2"></i> Clear Chat
                </Button>
                <Button variant="danger" onClick={async () => {
                  if (confirm('Are you sure you want to delete this group permanently? This cannot be undone.')) {
                    try {
                      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}`, {
                        method: 'DELETE',
                        headers: portalAuthHeaders
                      });
                      if (res.ok) {
                        setShowInfoModal(false);
                        setSelectedGroup(null);
                        fetchGroups();
                        alert('Group deleted successfully');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Failed to delete group');
                    }
                  }
                }}>
                  <i className="fas fa-ban me-2"></i> Delete Group
                </Button>
              </div>
            )}

            <div className="d-grid mt-2">
              <Button variant="outline-secondary" onClick={() => {
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
    <div className="h-100 d-flex overflow-hidden bg-surface rounded-4 shadow-sm">
      {/* Sidebar - Group List */}
      <div
        className={`d-flex flex-column border-end bg-surface ${selectedGroup ? 'd-none d-md-flex' : 'd-flex'}`}
        style={{ width: '100%', maxWidth: '380px', minWidth: '320px' }}
      >
        {/* Sidebar Header */}
        <div className="p-3 bg-surface border-bottom">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h4 className="fw-bold mb-0 text-main">Groups</h4>
            <Button variant="primary" size="sm" className="rounded-circle shadow-sm d-flex align-items-center justify-content-center p-0" onClick={() => setShowCreateModal(true)} style={{ width: 36, height: 36 }}>
              <i className="fas fa-plus"></i>
            </Button>
          </div>

          {/* Tabs */}
          <div className="d-flex gap-2 p-1 bg-surface rounded-pill border">
            <button
              className={`flex-grow-1 btn btn-sm rounded-pill fw-bold ${activeTab === 'my-groups' ? 'btn-white shadow-sm text-primary' : 'text-muted'}`}
              onClick={() => setActiveTab('my-groups')}
            >
              My Groups
            </button>
            <button
              className={`flex-grow-1 btn btn-sm rounded-pill fw-bold ${activeTab === 'discover' ? 'btn-white shadow-sm text-primary' : 'text-muted'}`}
              onClick={() => setActiveTab('discover')}
            >
              Discover
            </button>
          </div>
        </div>

        {/* Group List */}
        <div className="flex-grow-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" size="sm" /></div>
          ) : (
            <div className="d-flex flex-column">
              {(activeTab === 'my-groups' ? myGroups : otherGroups).length === 0 ? (
                <div className="text-center py-5 px-3 text-muted">
                  <div className="mb-3 opacity-50"><i className="fas fa-search fa-2x"></i></div>
                  <p className="small mb-0">No groups found. {activeTab === 'my-groups' ? 'Join one from Discover!' : 'Create one to get started!'}</p>
                </div>
              ) : (
                (activeTab === 'my-groups' ? myGroups : otherGroups).map(group => (
                  <div
                    key={group._id}
                    className={`p-3 border-bottom cursor-pointer transition-all hover-bg-surface ${selectedGroup?._id === group._id ? 'bg-primary bg-opacity-10 border-start border-4 border-primary' : ''}`}
                    onClick={() => {
                      console.log(`[GroupsView] Selected group: ${group.name}, isMember: ${group.isMember}, hasRequested: ${group.hasRequested}`);
                      if (group.isMember) {
                        setSelectedGroup(group);
                      } else {
                        // For discover tab, maybe show a preview modal or just select it but show join button?
                        // Current logic: click to select if member. If not member, show join button in card.
                        // Let's adapt: If discover, clicking opens a "Preview" state or just expands it.
                        // For now, let's keep the join logic simple: Click to select, if not member, show join overlay in main area.
                        setSelectedGroup(group);
                      }
                    }}
                    style={{ borderLeft: selectedGroup?._id === group._id ? '' : '4px solid transparent' }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="position-relative">
                        <div className={`rounded-circle d-flex align-items-center justify-content-center ${selectedGroup?._id === group._id ? 'bg-primary text-white' : 'bg-surface text-primary'}`} style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                          <i className={`fas fa-${group.icon || 'users'}`}></i>
                        </div>
                        {group.isMember && <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle"></span>}
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <h6 className="fw-bold mb-0 text-truncate">{group.name}</h6>
                          {group.last_message_at && (
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(group.last_message_at).toLocaleDateString() === new Date().toLocaleDateString()
                                ? new Date(group.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : new Date(group.last_message_at).toLocaleDateString()}
                            </small>
                          )}
                        </div>
                        <div className="d-flex align-items-center justify-content-between">
                          <p className="text-muted small mb-0 text-truncate" style={{ maxWidth: '180px' }}>
                            {group.description || 'No description'}
                          </p>
                          {!group.isMember && (
                            <Button
                              variant={group.hasRequested ? "secondary" : "outline-primary"}
                              size="sm"
                              className="py-0 px-2"
                              style={{ fontSize: '0.7rem' }}
                              disabled={group.hasRequested}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinToggle(group);
                              }}
                            >
                              {group.hasRequested ? 'Pending' : 'Request'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-grow-1 d-flex flex-column bg-surface ${!selectedGroup ? 'd-none d-md-flex' : 'd-flex'}`} style={{ height: '100%' }}>
        {selectedGroup ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-surface shadow-sm z-1">
              <div className="d-flex align-items-center gap-3">
                <Button variant="light" size="sm" className="d-md-none rounded-circle" onClick={() => setSelectedGroup(null)}>
                  <i className="fas fa-arrow-left"></i>
                </Button>
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                  <i className={`fas fa-${selectedGroup.icon || 'users'}`}></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-0">{selectedGroup.name}</h6>
                  <small className="text-muted">
                    {selectedGroup.memberCount} members
                    {selectedGroup.isMember ? ' • You are a member' : ' • Preview Mode'}
                  </small>
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button variant="light" className="rounded-circle text-primary" onClick={() => setShowInfoModal(true)} style={{ width: 40, height: 40 }}>
                  <i className="fas fa-info-circle"></i>
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow-1 p-4 overflow-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-body)', backgroundImage: 'radial-gradient(#dee2e6 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              {!selectedGroup.isMember ? (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center">
                  <div className="bg-surface p-5 rounded-4 shadow-sm" style={{ maxWidth: '400px' }}>
                    <div className="mb-4 text-primary opacity-75"><i className="fas fa-lock fa-4x"></i></div>
                    <h4 className="fw-bold mb-2">Join to Chat</h4>
                    <p className="text-muted mb-4">You need to be a member of this group to view and send messages.</p>
                    <Button
                      variant={selectedGroup.hasRequested ? "secondary" : "primary"}
                      size="lg"
                      className="w-100 rounded-pill"
                      disabled={selectedGroup.hasRequested}
                      onClick={() => handleJoinToggle(selectedGroup)}
                    >
                      {selectedGroup.hasRequested ? 'Request Pending' : 'Request to Join'}
                    </Button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted mt-5">
                  <div className="mb-3 opacity-25"><i className="fas fa-comments fa-4x"></i></div>
                  <p>No messages yet. Be the first to say hello!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSelf = msg.sender._id === student._id;
                  const showHeader = idx === 0 || messages[idx - 1].sender._id !== msg.sender._id;

                  return (
                    <div key={msg._id || idx} className={`d-flex flex-column mb-1 ${isSelf ? 'align-items-end' : 'align-items-start'}`}>
                      {showHeader && !isSelf && (
                        <small className="text-muted ms-2 mt-2 mb-1 fw-bold" style={{ fontSize: '0.75rem' }}>
                          {msg.sender.first_name} {msg.sender.last_name}
                        </small>
                      )}
                      <div
                        className={`px-3 py-2 shadow-sm position-relative ${isSelf ? 'bg-primary text-white' : 'bg-surface text-main'}`}
                        style={{
                          maxWidth: '70%',
                          borderRadius: '18px',
                          borderTopLeftRadius: !isSelf && !showHeader ? '4px' : '18px',
                          borderTopRightRadius: isSelf && !showHeader ? '4px' : '18px',
                          borderBottomLeftRadius: !isSelf ? '4px' : '18px',
                          borderBottomRightRadius: isSelf ? '4px' : '18px'
                        }}
                      >
                        <div style={{ wordBreak: 'break-word' }}>{msg.content}</div>
                        <div className={`text-end mt-1 ${isSelf ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {selectedGroup.isMember && (
              <div className="p-3 bg-surface border-top">
                <Form onSubmit={handleSendMessage}>
                  <div className="d-flex gap-2 align-items-end bg-surface p-2 rounded-4 border">
                    <Button variant="link" className="text-muted text-decoration-none rounded-circle" style={{ width: 40, height: 40 }}>
                      <i className="far fa-smile fa-lg"></i>
                    </Button>
                    <Form.Control
                      as="textarea"
                      rows={1}
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="bg-transparent border-0 shadow-none px-2 py-2"
                      style={{ resize: 'none', maxHeight: '100px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      className="rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                      style={{ width: 40, height: 40 }}
                      disabled={!messageText.trim()}
                    >
                      <i className="fas fa-paper-plane"></i>
                    </Button>
                  </div>
                </Form>
              </div>
            )}
          </>
        ) : (
          <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted bg-surface">
            <div className="mb-4 opacity-50"><i className="fas fa-comments fa-5x"></i></div>
            <h4 className="fw-bold">Welcome to Groups</h4>
            <p>Select a group from the sidebar to start chatting.</p>
          </div>
        )}
      </div>

      {/* Group Info Modal */}
      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Group Info</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedGroup && (
            <>
              <div className="text-center mb-4">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 80, height: 80, fontSize: '2rem' }}>
                  <i className={`fas fa-${selectedGroup.icon || 'users'}`}></i>
                </div>
                <h4 className="fw-bold">{selectedGroup.name}</h4>
                <p className="text-muted">{selectedGroup.description}</p>
              </div>

              <div className="mb-4">
                <h6 className="fw-bold mb-3">Invite Link</h6>
                <div className="p-3 bg-surface rounded-3">
                  {selectedGroup.invite_code ? (
                    <div>
                      <div className="d-flex gap-2 mb-2">
                        <Form.Control
                          readOnly
                          value={`${window.location.origin}/student-portal?invite=${selectedGroup.invite_code}`}
                          className="bg-surface"
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
                    placeholder="Enter Student Email"
                    value={addMemberEmail}
                    onChange={(e) => setAddMemberEmail(e.target.value)}
                  />
                  <Button type="submit" variant="primary" disabled={addMemberLoading}>
                    {addMemberLoading ? <Spinner size="sm" animation="border" /> : 'Add'}
                  </Button>
                </Form>
                <small className="text-muted">Enter their email address to add them directly.</small>
              </div>

              {/* Join Requests (Admin Only) */}
              {selectedGroup.admins && selectedGroup.admins.includes(student._id) && (
                <div className="mb-4">
                  <h6 className="fw-bold mb-3">Join Requests</h6>
                  <JoinRequestsList groupId={selectedGroup._id} />
                </div>
              )}

              <div className="mb-4">
                <h6 className="fw-bold mb-3">Members ({selectedGroup.members?.length || 0})</h6>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedGroup.members && selectedGroup.members.map(member => {
                    if (!member) return null; // Safety check
                    const isAdmin = selectedGroup.admins && selectedGroup.admins.includes(member._id);
                    const isMe = member._id === student._id;
                    const amIAdmin = selectedGroup.admins && selectedGroup.admins.includes(student._id);

                    return (
                      <div key={member._id} className="d-flex align-items-center justify-content-between p-2 bg-surface rounded-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                            {member.profile_picture ? (
                              <img src={member.profile_picture} alt="" className="w-100 h-100 rounded-circle object-fit-cover" />
                            ) : (
                              <span className="small fw-bold">{member.first_name?.[0]}{member.last_name?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold small">{member.first_name} {member.last_name}</span>
                              {isAdmin && <Badge bg="success" style={{ fontSize: '0.6rem' }}>Admin</Badge>}
                              {isMe && <Badge bg="secondary" style={{ fontSize: '0.6rem' }}>You</Badge>}
                            </div>
                            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{member.mail_id || 'No email'}</div>
                          </div>
                        </div>

                        {amIAdmin && !isMe && (
                          <Dropdown>
                            <Dropdown.Toggle variant="link" className="text-muted p-0 no-caret">
                              <i className="fas fa-ellipsis-v"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                              {isAdmin ? (
                                <Dropdown.Item onClick={async () => {
                                  if (confirm(`Demote ${member.first_name} from Admin?`)) {
                                    try {
                                      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/manage-member`, {
                                        method: 'POST',
                                        headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ memberId: member._id, action: 'demote' })
                                      });
                                      if (res.ok) fetchGroups();
                                    } catch (e) { console.error(e); }
                                  }
                                }}>Dismiss as Admin</Dropdown.Item>
                              ) : (
                                <Dropdown.Item onClick={async () => {
                                  if (confirm(`Make ${member.first_name} a Group Admin?`)) {
                                    try {
                                      const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/manage-member`, {
                                        method: 'POST',
                                        headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ memberId: member._id, action: 'promote' })
                                      });
                                      if (res.ok) fetchGroups();
                                    } catch (e) { console.error(e); }
                                  }
                                }}>Make Group Admin</Dropdown.Item>
                              )}
                              <Dropdown.Divider />
                              <Dropdown.Item className="text-danger" onClick={async () => {
                                if (confirm(`Remove ${member.first_name} from the group?`)) {
                                  try {
                                    const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/manage-member`, {
                                      method: 'DELETE',
                                      headers: { ...portalAuthHeaders, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ memberId: member._id })
                                    });
                                    if (res.ok) fetchGroups();
                                  } catch (e) { console.error(e); }
                                }
                              }}>Remove from Group</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Actions */}
              {selectedGroup.admins && selectedGroup.admins.includes(student._id) && (
                <div className="d-grid gap-2 mt-4 pt-3 border-top">
                  <Button variant="outline-danger" onClick={async () => {
                    if (confirm('Are you sure you want to clear the entire chat history? This cannot be undone.')) {
                      try {
                        const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}/messages`, {
                          method: 'DELETE',
                          headers: portalAuthHeaders
                        });
                        if (res.ok) {
                          setMessages([]);
                          alert('Chat cleared successfully');
                        }
                      } catch (err) {
                        console.error(err);
                        alert('Failed to clear chat');
                      }
                    }
                  }}>
                    <i className="fas fa-trash-alt me-2"></i> Clear Chat
                  </Button>
                  <Button variant="danger" onClick={async () => {
                    if (confirm('Are you sure you want to delete this group permanently? This cannot be undone.')) {
                      try {
                        const res = await fetch(`/api/student-portal/groups/${selectedGroup._id}`, {
                          method: 'DELETE',
                          headers: portalAuthHeaders
                        });
                        if (res.ok) {
                          setShowInfoModal(false);
                          setSelectedGroup(null);
                          fetchGroups();
                          alert('Group deleted successfully');
                        }
                      } catch (err) {
                        console.error(err);
                        alert('Failed to delete group');
                      }
                    }
                  }}>
                    <i className="fas fa-ban me-2"></i> Delete Group
                  </Button>
                </div>
              )}

              <div className="d-grid mt-2">
                <Button variant="outline-secondary" onClick={() => {
                  handleJoinToggle(selectedGroup);
                  setShowInfoModal(false);
                }}>
                  Leave Group
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

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
                onChange={e => setNewGroupData({ ...newGroupData, name: e.target.value })}
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
                onChange={e => setNewGroupData({ ...newGroupData, description: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Icon</Form.Label>
              <div className="d-flex gap-3 flex-wrap">
                {['users', 'code', 'book', 'coffee', 'gamepad', 'music', 'graduation-cap'].map(icon => (
                  <div
                    key={icon}
                    className={`rounded-circle d-flex align-items-center justify-content-center cursor-pointer border ${newGroupData.icon === icon ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-light'}`}
                    style={{ width: 40, height: 40, cursor: 'pointer' }}
                    onClick={() => setNewGroupData({ ...newGroupData, icon })}
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
