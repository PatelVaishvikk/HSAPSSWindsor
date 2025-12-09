import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Row, Col, Modal, Form, InputGroup, Nav, Spinner } from 'react-bootstrap';
import {
  Book, Upload, Search, Star,
  Monitor, Database, Music, Sparkles,
  BookOpen, Eye, PlayCircle, Youtube, Film, Trash2, RefreshCw
} from 'lucide-react';

/**
 * Digital Library ("The Archive") - Link Database Edition
 * Features: 
 * - Shared Collection (MongoDB)
 * - Link Only (Zero Storage Limit)
 * - Owner Deletion
 * - GitHub Sync (Seed button)
 */
export default function DigitalLibrary({ currentUser }) {
  const [activeTab, setActiveTab] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [libraryItems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0); // To force re-fetch

  // 1. Fetch from Database
  useEffect(() => {
    fetchResources();

    // Load local saves
    const saved = localStorage.getItem('library_saved_ids');
    if (saved) setSavedItemIds(new Set(JSON.parse(saved)));
  }, [refreshTrigger]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student-portal/resources');
      const data = await res.json();
      if (data.success) {
        setLibraryItems(data.data);
      }
    } catch (error) {
      console.error("Failed to load library:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Upload (Link Only)
  const [uploadType, setUploadType] = useState('pdf');
  const [uploadData, setUploadData] = useState({
    title: '',
    author: '',
    category: 'it',
    tags: '',
    url: '', // This is now the LINK for both types
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to extract YouTube ID
  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.url) return;

    setIsSubmitting(true);

    let finalUrl = uploadData.url;
    let thumbnail = null;
    let youtubeId = null;

    if (uploadType === 'video') {
      youtubeId = getYoutubeId(finalUrl);
      if (!youtubeId) {
        alert('Invalid YouTube URL');
        setIsSubmitting(false);
        return;
      }
      finalUrl = `https://www.youtube.com/embed/${youtubeId}`;
      thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }

    const newItem = {
      type: uploadType,
      title: uploadData.title,
      author: uploadData.author || currentUser?.first_name || 'Anonymous',
      category: uploadData.category,
      tags: uploadData.tags ? uploadData.tags.split(',').map(t => t.trim()) : [],
      url: finalUrl,
      thumbnail: thumbnail,
      youtubeId: youtubeId,
      uploaded_by: currentUser?.first_name || 'Student',
      uploader_id: currentUser?._id || currentUser?.email || 'unknown'
    };

    try {
      const res = await fetch('/api/student-portal/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setShowUploadModal(false);
        setRefreshTrigger(prev => prev + 1); // Reload list
        setUploadData({ title: '', author: '', category: 'it', tags: '', url: '' });
      } else {
        alert('Failed to share resource.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete (Real DB Delete)
  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete "${item.title}" from the library?`)) return;

    try {
      const res = await fetch('/api/student-portal/resources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item._id, uploader_id: item.uploader_id })
      });
      if (res.ok) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert("Could not delete. You might not have permission.");
      }
    } catch (err) {
      alert("Delete failed.");
    }
  };

  // 4. Reset / Seed (GitHub -> DB)
  const handleSeed = async () => {
    if (!confirm("Load 'Official' books from code into the database? This puts them in the shared library.")) return;

    try {
      const res = await fetch('/api/student-portal/resources/seed', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert("Sync failed.");
    }
  };

  const toggleSave = (e, item) => {
    e.stopPropagation();
    const newSaved = new Set(savedItemIds);
    if (newSaved.has(item._id)) { // MongoDB uses _id
      newSaved.delete(item._id);
    } else {
      newSaved.add(item._id);
    }
    setSavedItemIds(newSaved);
    localStorage.setItem('library_saved_ids', JSON.stringify(Array.from(newSaved)));
  };

  // Permission Check
  const canDelete = (item) => {
    const currentUserId = currentUser?._id || currentUser?.email;
    const adminPhones = ['5199927920']; // Hardcoded Admin for now

    // 1. Owner can delete
    if (item.uploader_id === currentUserId) return true;

    // 2. Admin can delete EVERYTHING (including Seed items)
    if (currentUser?.phone && adminPhones.includes(currentUser.phone.replace(/\D/g, ''))) return true;

    return false;
  };

  const filteredItems = libraryItems.filter(item => {
    if (activeTab === 'saved') {
      if (!savedItemIds.has(item._id)) return false;
    } else if (activeTab === 'cinema') {
      if (item.type !== 'video') return false;
    } else if (activeTab !== 'all') {
      if (item.category !== activeTab) return false;
    }

    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All Collection', icon: <Book size={18} /> },
    { id: 'it', label: 'IT & CS', icon: <Monitor size={18} /> },
    { id: 'data_science', label: 'Data Science & AI', icon: <Database size={18} /> },
    { id: 'music', label: 'Music & Arts', icon: <Music size={18} /> },
    { id: 'spiritual', label: 'Spiritual', icon: <Sparkles size={18} /> },
    { id: 'cinema', label: 'The Cinema', icon: <Film size={18} /> },
    { id: 'saved', label: 'My Collection', icon: <Star size={18} className="text-warning" /> },
  ];

  return (
    <div className="digital-library h-100 d-flex flex-column bg-surface rounded-4 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-surface border-bottom">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1 text-main" style={{ letterSpacing: '-0.5px' }}>
              <BookOpen className="text-primary me-2 mb-1" size={32} />
              The Archive
            </h2>
            <p className="text-muted mb-0">
              Shared Knowledge Repository.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button
              className="rounded-pill px-3 shadow-sm d-flex align-items-center gap-2 bg-transparent border text-main"
              onClick={handleSeed}
              title="Pull Official Books from GitHub code"
            >
              <RefreshCw size={16} />
              <span className="d-none d-sm-inline">Sync Official</span>
            </Button>
            <Button
              variant="dark"
              className="rounded-pill px-4 shadow-sm d-flex align-items-center gap-2"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={18} />
              <span className="d-none d-sm-inline">Share Resource</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center">
          <Nav variant="pills" className="gap-2 overflow-auto flex-nowrap pb-2 pb-md-0 hide-scrollbar">
            {categories.map(cat => (
              <Nav.Item key={cat.id}>
                <Nav.Link
                  active={activeTab === cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`rounded-pill d-flex align-items-center gap-2 px-3 ${activeTab === cat.id ? 'bg-primary text-white' : 'bg-surface text-muted border'}`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {cat.icon}
                  {cat.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>

          <InputGroup style={{ maxWidth: '300px' }} className="shadow-sm rounded-pill overflow-hidden">
            <InputGroup.Text className="bg-body border-0 ps-3 pe-2">
              <Search size={18} className="text-primary" />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search..."
              className="border-0 shadow-none bg-body text-main ps-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-grow-1 p-4 overflow-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-body)' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading Library...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-5 opacity-50">
            <Book size={48} className="mb-3" />
            <h5>Library is Empty</h5>
            <p>Click "Sync Official" to load the starter books!</p>
          </div>
        ) : (
          <Row className="g-4">
            {filteredItems.map(item => (
              <Col xs={12} sm={6} md={4} xl={3} key={item._id}>
                <Card
                  className="h-100 border-0 shadow-sm book-card hover-lift overflow-hidden bg-surface"
                  onClick={() => { setSelectedItem(item); setShowReader(true); }}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                >
                  <div
                    className="book-cover position-relative p-4 d-flex flex-column justify-content-between"
                    style={{
                      height: '240px',
                      background: item.type === 'video' ? `url(${item.thumbnail}) center/cover` : item.cover_color,
                      color: 'white',
                      position: 'relative'
                    }}
                  >
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-t from-black to-transparent opacity-60" style={{ pointerEvents: 'none' }} />
                    {item.type === 'video' && <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50" />}

                    <div className="d-flex justify-content-between align-items-start position-relative w-100" style={{ zIndex: 3 }}>
                      <Badge className="bg-surface text-main opacity-90 shadow-sm text-truncate px-2">
                        {item.category === 'data_science' ? 'Data Sci' : item.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="d-flex gap-2">
                        {canDelete(item) && (
                          <Button
                            variant="danger" size="sm"
                            className="p-1 rounded-circle bg-danger border-0 opacity-75 hover-opacity-100"
                            onClick={(e) => handleDelete(e, item)}
                          >
                            <Trash2 size={14} className="text-white" />
                          </Button>
                        )}
                        <Button variant="link" className="p-0 text-white hover-scale" onClick={(e) => toggleSave(e, item)}>
                          <Star size={20} fill={savedItemIds.has(item._id) ? "white" : "none"} strokeWidth={2} />
                        </Button>
                      </div>
                    </div>

                    {item.type === 'video' && (
                      <div className="position-absolute top-50 start-50 translate-middle text-white z-2">
                        <PlayCircle size={56} className="opacity-90 drop-shadow" />
                      </div>
                    )}

                    <div className="position-relative mt-auto" style={{ zIndex: 3 }}>
                      <h5 className="fw-bold mb-1 text-shadow line-clamp-2">{item.title}</h5>
                      <small className="opacity-90 text-shadow d-block text-truncate">
                        {item.author}
                      </small>
                    </div>
                  </div>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between text-muted small">
                      <span>{item.type === 'video' ? 'Video' : 'PDF Link'}</span>
                      <span>By {item.uploaded_by}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Share Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Share a Resource</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Nav variant="tabs" className="mb-4" activeKey={uploadType} onSelect={(k) => { setUploadType(k); setUploadData({ ...uploadData, url: '' }); }}>
            <Nav.Item><Nav.Link eventKey="pdf" className="gap-2"><Book size={18} /> PDF Link</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="video" className="gap-2"><Youtube size={18} /> Video Link</Nav.Link></Nav.Item>
          </Nav>

          <Form onSubmit={handleUploadSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Resource URL {uploadType === 'pdf' ? '(Google Drive, Dropbox, etc.)' : '(YouTube)'}</Form.Label>
              <Form.Control
                required
                type="url"
                placeholder={uploadType === 'video' ? "https://youtube.com/..." : "https://drive.google.com/..."}
                value={uploadData.url}
                onChange={e => setUploadData({ ...uploadData, url: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control required value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} /></Form.Group></Col>
              <Col><Form.Group className="mb-3"><Form.Label>Category</Form.Label>
                <Form.Select value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })}>
                  <option value="it">IT & CS</option>
                  <option value="data_science">Data Science</option>
                  <option value="music">Music</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="cinema">Cinema</option>
                </Form.Select>
              </Form.Group></Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="light" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sharing...' : 'Share Now'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Reader Modal */}
      <Modal show={showReader} onHide={() => setShowReader(false)} fullscreen>
        <Modal.Header closeButton className="bg-dark text-white border-bottom border-secondary">
          <h5 className="mb-0">{selectedItem?.title}</h5>
          <Button variant="outline-light" size="sm" className="ms-3" href={selectedItem?.url} target="_blank">
            Open Original Link <Upload size={14} className="ms-1" />
          </Button>
        </Modal.Header>
        <Modal.Body className="p-0 bg-black d-flex align-items-center justify-content-center">
          {selectedItem?.type === 'video' ? (
            <iframe width="100%" height="100%" src={`${selectedItem.url}?autoplay=1`} frameBorder="0" allowFullScreen />
          ) : (
            <div className="text-center text-white">
              <Book size={64} className="mb-3 text-muted" />
              <h3>External Resource</h3>
              <p>This is a link to an external PDF/Document.</p>
              <Button variant="primary" size="lg" href={selectedItem?.url} target="_blank">View Document</Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .hover-scale { transition: transform 0.2s; }
        .hover-scale:hover { transform: scale(1.1); }
        .drop-shadow { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
        .hover-opacity-100:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
