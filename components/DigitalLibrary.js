import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Row, Col, Modal, Form, InputGroup, Nav, Spinner, Carousel } from 'react-bootstrap';
import {
  Book, Upload, Search, Star,
  Monitor, Database, Music, Sparkles,
  BookOpen, Eye, PlayCircle, Youtube, Film, Trash2, RefreshCw,
  Flame, ChevronRight
} from 'lucide-react';

/**
 * Digital Library ("The Archive") - Premium Edition
 * Features: 
 * - Featured Carousel (Netflix Style)
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
  const [featuredItems, setFeaturedItems] = useState([]);
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
        // Select 3 random video/cinema items for Featured Hero
        const videos = data.data.filter(i => i.type === 'video');
        const shuffled = videos.sort(() => 0.5 - Math.random());
        setFeaturedItems(shuffled.slice(0, 3));
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
    { id: 'all', label: 'All', icon: <Book size={18} /> },
    { id: 'it', label: 'Tech & CS', icon: <Monitor size={18} /> },
    { id: 'data_science', label: 'Data & AI', icon: <Database size={18} /> },
    { id: 'music', label: 'Arts', icon: <Music size={18} /> },
    { id: 'spiritual', label: 'Spirit', icon: <Sparkles size={18} /> },
    { id: 'cinema', label: 'Cinema', icon: <Film size={18} /> },
    { id: 'saved', label: 'Saved', icon: <Star size={18} className="text-warning" /> },
  ];

  return (
    <div className="digital-library h-100 d-flex flex-column bg-black rounded-4 shadow-sm overflow-hidden text-white">
      {/* 1. Header & Featured Section */}
      <div className="flex-shrink-0 bg-dark-gradient border-bottom border-dark-subtle">
        {/* Navigation Bar */}
        <div className="d-flex justify-content-between align-items-center p-4">
            <h2 className="fw-bold mb-0 text-white d-flex align-items-center gap-2" style={{ letterSpacing: '-0.5px' }}>
              <span className="text-primary">The</span>Archive
            </h2>
            <div className="d-flex gap-2">
                <InputGroup className="d-none d-md-flex" style={{ width: '250px' }}>
                    <InputGroup.Text className="bg-dark border-secondary text-secondary"><Search size={16}/></InputGroup.Text>
                    <Form.Control 
                        placeholder="Search titles..." 
                        className="bg-dark border-secondary text-white shadow-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </InputGroup>
                
                {currentUser?.email === 'admin' && ( // Only show if needed or move to overflow
                    <Button variant="outline-secondary" onClick={handleSeed} title="Restock Library">
                        <RefreshCw size={18} />
                    </Button>
                )}
                
                <Button 
                    variant="primary" 
                    className="rounded-pill px-4 shadow-lg fw-bold d-flex align-items-center gap-2"
                    onClick={() => setShowUploadModal(true)}
                >
                    <Upload size={18} />
                    <span className="d-none d-sm-inline">Upload</span>
                </Button>
            </div>
        </div>

        {/* Featured Carousel */}
        {featuredItems.length > 0 && activeTab === 'all' && !searchQuery && (
            <div className="px-4 pb-4">
                <Carousel controls={false} indicators={false} interval={5000} fade>
                    {featuredItems.map(item => (
                        <Carousel.Item key={item._id}>
                             <div 
                                className="featured-card position-relative rounded-4 overflow-hidden cursor-pointer"
                                style={{ height: '300px' }}
                                onClick={() => { setSelectedItem(item); setShowReader(true); }}
                             >
                                <div 
                                    className="position-absolute w-100 h-100"
                                    style={{ 
                                        backgroundImage: `url(${item.thumbnail})`, 
                                        backgroundSize: 'cover', 
                                        backgroundPosition: 'center',
                                        filter: 'brightness(0.6)'
                                    }}
                                />
                                <div className="position-absolute w-100 h-100 bg-gradient-to-r from-black via-transparent to-transparent" />
                                
                                <div className="position-absolute bottom-0 start-0 p-5 w-100 w-md-75">
                                    <Badge bg="danger" className="mb-3 d-flex align-items-center gap-1 w-auto" style={{width: 'fit-content'}}>
                                        <Flame size={12} fill="white" /> FEATURED
                                    </Badge>
                                    <h1 className="display-5 fw-bold text-white mb-2 text-shadow">{item.title}</h1>
                                    <p className="lead text-white-50 line-clamp-2 d-none d-md-block">{item.author} • {item.category.toUpperCase()}</p>
                                    <Button variant="light" size="lg" className="rounded-pill px-4 fw-bold mt-2">
                                        <PlayCircle size={20} className="me-2" fill="black" />
                                        Watch Now
                                    </Button>
                                </div>
                             </div>
                        </Carousel.Item>
                    ))}
                </Carousel>
            </div>
        )}

        {/* Categories Tab */}
        <div className="px-4 pb-0 d-flex gap-2 overflow-auto hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 mb-3 border-0 transition-all ${
                    activeTab === cat.id 
                    ? 'bg-white text-black fw-bold shadow' 
                    : 'bg-dark bg-opacity-50 text-white-50 hover-bg-dark text-hover-white'
                }`}
                style={{ whiteSpace: 'nowrap' }}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
        </div>
      </div>

      {/* 2. Main Grid */}
      <div className="flex-grow-1 p-4 overflow-auto custom-scrollbar" style={{ backgroundColor: '#121212' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading The Archive...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-5 opacity-50">
            <Book size={64} className="mb-4 text-muted" />
            <h3>No results found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <Row className="g-4">
            {filteredItems.map(item => (
              <Col xs={6} md={4} xl={3} key={item._id}>
                <div 
                    className="position-relative card-hover-effect rounded-3 overflow-hidden"
                    onClick={() => { setSelectedItem(item); setShowReader(true); }}
                    style={{ aspectRatio: '2/3', cursor: 'pointer', backgroundColor: '#1e1e1e' }}
                >
                    {/* Cover Image */}
                    <div className="w-100 h-100 position-relative">
                        {item.type === 'video' ? (
                            <img src={item.thumbnail} className="w-100 h-100 object-fit-cover opacity-75" alt="" />
                        ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{background: item.cover_color || '#333'}}>
                                <Book size={48} className="text-white opacity-25" />
                            </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div className="position-absolute bottom-0 start-0 w-100 h-75 bg-gradient-to-t from-black to-transparent" />
                        
                        {/* Content */}
                        <div className="position-absolute bottom-0 start-0 p-3 w-100">
                             <div className="d-flex justify-content-between align-items-end mb-2">
                                <span className="badge bg-white bg-opacity-10 backdrop-blur-sm small fw-normal">
                                    {item.category === 'data_science' ? 'Data' : item.category}
                                </span>
                                {item.type === 'video' ? <PlayCircle size={16} className="text-white" /> : <BookOpen size={16} className="text-white" />}
                             </div>
                             <h6 className="text-white mb-1 line-clamp-2" style={{fontSize: '0.95rem'}}>{item.title}</h6>
                             <small className="text-white-50 d-block text-truncate">{item.author}</small>
                        </div>

                        {/* Hover Actions */}
                        <div className="position-absolute top-0 end-0 p-2 d-none d-md-block opacity-0 hover-opacity-100 transition-all">
                             <button 
                                className="btn btn-dark btn-sm rounded-circle p-2 shadow-sm"
                                onClick={(e) => toggleSave(e, item)}
                             >
                                <Star size={14} fill={savedItemIds.has(item._id) ? "gold" : "none"} color={savedItemIds.has(item._id) ? "gold" : "white"} />
                             </button>
                             {canDelete(item) && (
                                <button 
                                    className="btn btn-danger btn-sm rounded-circle p-2 shadow-sm ms-2"
                                    onClick={(e) => handleDelete(e, item)}
                                >
                                    <Trash2 size={14} />
                                </button>
                             )}
                        </div>
                    </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Share Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered size="lg" contentClassName="bg-dark text-white border-secondary">
        <Modal.Header closeButton closeVariant="white" className="border-secondary">
          <Modal.Title className="fw-bold">Share to Archive</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Nav variant="pills" className="mb-4 bg-black p-1 rounded-pill d-inline-flex" activeKey={uploadType} onSelect={(k) => { setUploadType(k); setUploadData({ ...uploadData, url: '' }); }}>
            <Nav.Item><Nav.Link eventKey="pdf" className="rounded-pill px-4 text-white">PDF Link</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="video" className="rounded-pill px-4 text-white">Video</Nav.Link></Nav.Item>
          </Nav>

          <Form onSubmit={handleUploadSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="text-secondary">Resource Link</Form.Label>
              <Form.Control
                required
                type="url"
                className="bg-black border-secondary text-white"
                placeholder={uploadType === 'video' ? "https://youtube.com/..." : "https://drive.google.com/..."}
                value={uploadData.url}
                onChange={e => setUploadData({ ...uploadData, url: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col><Form.Group className="mb-3">
                <Form.Label className="text-secondary">Title</Form.Label>
                <Form.Control required className="bg-black border-secondary text-white" value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} />
                </Form.Group></Col>
              <Col><Form.Group className="mb-3">
                <Form.Label className="text-secondary">Category</Form.Label>
                <Form.Select className="bg-black border-secondary text-white" value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })}>
                  <option value="it">Tech & CS</option>
                  <option value="data_science">Data & AI</option>
                  <option value="music">Arts & Music</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="cinema">Cinema</option>
                </Form.Select>
              </Form.Group></Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-light" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sharing...' : 'Share Now'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Reader Modal */}
      <Modal show={showReader} onHide={() => setShowReader(false)} fullscreen>
        <Modal.Header closeButton closeVariant="white" className="bg-black text-white border-bottom border-dark">
          <h5 className="mb-0">{selectedItem?.title}</h5>
          <Button variant="outline-light" size="sm" className="ms-3" href={selectedItem?.url} target="_blank">
            Open Original <ChevronRight size={14} />
          </Button>
        </Modal.Header>
        <Modal.Body className="p-0 bg-black d-flex align-items-center justify-content-center">
          {selectedItem?.type === 'video' ? (
            <iframe width="100%" height="100%" src={`${selectedItem.url}?autoplay=1`} frameBorder="0" allowFullScreen />
          ) : (
            <div className="text-center text-white">
              <Book size={64} className="mb-3 text-secondary" />
              <h3>External Resource</h3>
              <p className="text-secondary">This resource is hosted externally.</p>
              <Button variant="primary" size="lg" className="rounded-pill px-5" href={selectedItem?.url} target="_blank">View Document</Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <style jsx>{`
        .bg-dark-gradient { background: linear-gradient(180deg, #1A1A1A 0%, #121212 100%); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .text-shadow { text-shadow: 0 4px 20px rgba(0,0,0,0.8); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-hover-effect { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover-effect:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 10; }
        .hover-bg-dark:hover { background-color: rgba(255,255,255,0.1) !important; }
        .hover-opacity-100:hover { opacity: 1 !important; }
        .transition-all { transition: all 0.2s ease; }
        .bg-gradient-to-t { background: linear-gradient(to top, var(--tw-gradient-from), var(--tw-gradient-to)); }
        .from-black { --tw-gradient-from: #000; --tw-gradient-to: rgba(0,0,0,0); }
        .bg-gradient-to-r { background: linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to)); }
        .via-transparent { --tw-gradient-via: transparent; }
      `}</style>
    </div>
  );
}
