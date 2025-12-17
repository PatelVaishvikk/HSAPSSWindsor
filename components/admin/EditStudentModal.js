
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Button, Form, Row, Col, Card, Spinner } from 'react-bootstrap';
import {
  MANDAL_OPTIONS,
  MUKT_OPTIONS,
  INSTITUTION_OPTIONS,
  POST_GRAD_OPTIONS,
  PROGRAM_LIBRARY
} from '../../config/adminConstants';
import {
  getProgramDefinition,
  formatDateForInput
} from '../../lib/adminUtils';

export default function EditStudentModal({ show, onHide, student, currentUser, onSave, isSaving }) {
  // Initial Form State
  const initialFormState = {
    first_name: '', last_name: '', mail_id: '', phone: '', address: '',
    date_of_birth: '', gender: '',
    education: '', study_level: '', study_institution: '', study_program: '', study_specialization: '', study: '',
    emergency_contact: '', notes: '',
    box_cricket: false, box_cricket_years: '',
    atmiya_cricket_tournament: false, atmiya_cricket_years: '',
    atmiya_youth_shibir: false, atmiya_youth_years: '',
    yuva_mahotsav: false, yuva_mahotsav_years: '',
    harimay: false,
    moved_out: false, moved_out_date: '', moved_out_job: '', moved_out_address: '', moved_out_notes: '',
    graduation_completed: false, graduation_date: '',
    post_graduation_plan: '', employment_status: '', employment_company: '', employment_role: '',
    mandal_name: '', mukt_type: 'Yuvak', // Default
    is_admin: false
  };

  const [formData, setFormData] = useState(initialFormState);

  // Initialize form when student changes
  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        mail_id: student.mail_id || '',
        phone: student.phone || '',
        address: student.address || '',
        date_of_birth: student.date_of_birth ? formatDateForInput(student.date_of_birth) : '',
        gender: student.gender || '',
        education: student.education || '',
        study_level: student.study_level || '',
        study_institution: student.study_institution || '',
        study_program: student.study_program || '',
        study_specialization: student.study_specialization || '',
        study: student.study || '',
        emergency_contact: student.emergency_contact || '',
        notes: student.notes || '',
        box_cricket: student.box_cricket || false,
        box_cricket_years: student.box_cricket_years || '',
        atmiya_cricket_tournament: student.atmiya_cricket_tournament || false,
        atmiya_cricket_years: student.atmiya_cricket_years || '',
        atmiya_youth_shibir: student.atmiya_youth_shibir || false,
        atmiya_youth_years: student.atmiya_youth_years || '',
        yuva_mahotsav: student.yuva_mahotsav || false,
        yuva_mahotsav_years: student.yuva_mahotsav_years || '',
        harimay: student.harimay || false,
        moved_out: student.moved_out || false,
        moved_out_date: student.moved_out_date ? formatDateForInput(student.moved_out_date) : '',
        moved_out_job: student.moved_out_job || '',
        moved_out_address: student.moved_out_address || '',
        moved_out_notes: student.moved_out_notes || '',
        graduation_completed: !!student.graduation_completed,
        graduation_date: student.graduation_date ? formatDateForInput(student.graduation_date) : '',
        post_graduation_plan: student.post_graduation_plan || student.employment_status || '',
        employment_status: student.employment_status || student.post_graduation_plan || '',
        employment_company: student.employment_company || '',
        employment_role: student.employment_role || '',
        mandal_name: student.mandal_name || '',
        mukt_type: student.mukt_type || 'Yuvak',
        is_admin: !!student.is_admin
      });
    } else {
      setFormData(initialFormState);
    }
  }, [student]);

  // Derived State Logic
  const availablePrograms = useMemo(
    () => PROGRAM_LIBRARY[formData.study_institution] || [],
    [formData.study_institution]
  );

  const selectedProgramDefinition = useMemo(
    () => getProgramDefinition(formData.study_institution, formData.study_program),
    [formData.study_institution, formData.study_program]
  );

  const availableSpecializations = useMemo(
    () => selectedProgramDefinition?.specializations || [],
    [selectedProgramDefinition]
  );

  const studySummary = useMemo(() => {
    const parts = [];
    if (selectedProgramDefinition) parts.push(selectedProgramDefinition.label);
    if (availableSpecializations.length > 0) {
      if (formData.study_specialization) parts.push(formData.study_specialization);
    } else if (formData.study_specialization) {
      parts.push(formData.study_specialization);
    }
    return parts.join(' - ');
  }, [selectedProgramDefinition, availableSpecializations, formData.study_specialization]);

  const showEmploymentFields = formData.post_graduation_plan === 'working';

  // Handlers
  const handleInstitutionChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      study_institution: value,
      study_program: '',
      study_specialization: '',
      study_level: '',
      education: '',
      study: ''
    }));
  };

  const handleProgramChange = (value) => {
    setFormData((prev) => {
      const definition = getProgramDefinition(prev.study_institution, value);
      return {
        ...prev,
        study_program: value,
        study_level: definition?.level || '',
        education: definition?.level || '',
        study_specialization: '',
        study: definition?.label || ''
      };
    });
  };

  const handlePostGradPlanChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      post_graduation_plan: value,
      employment_status: value,
      ...(value !== 'working' ? { employment_company: '', employment_role: '' } : {}),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Prepare payload
    const definition = getProgramDefinition(formData.study_institution, formData.study_program);
    const derivedLevel = definition?.level || formData.study_level || formData.education || '';
    const trim = (value) => (typeof value === 'string' ? value.trim() : value);
    
    const payload = {
      ...formData,
      education: derivedLevel,
      study_level: derivedLevel,
      study_institution: formData.study_institution || '',
      study_program: formData.study_program || '',
      study_specialization: trim(formData.study_specialization),
      study: (studySummary || formData.study || '').trim(),
      graduation_completed: !!formData.graduation_completed,
      graduation_date: formData.graduation_completed && formData.graduation_date ? formData.graduation_date : '',
      post_graduation_plan: trim(formData.post_graduation_plan) || '',
      employment_status: trim(formData.post_graduation_plan) || '',
      employment_company: trim(formData.post_graduation_plan === 'working' ? formData.employment_company : ''),
      employment_role: trim(formData.post_graduation_plan === 'working' ? formData.employment_role : ''),
    };

    // Cleanup empty fields
    if (!payload.study_program && !payload.study) {
      delete payload.study_institution;
      delete payload.study_program;
      delete payload.study_specialization;
      delete payload.study_level;
      delete payload.study;
    }
    if (payload.post_graduation_plan !== 'working') {
      delete payload.employment_company;
      delete payload.employment_role;
    }

    onSave(payload);
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" scrollable contentClassName="solid-modal">
      <Modal.Header closeButton>
        <Modal.Title className="h6">
          <i className="fas fa-user-edit me-2"></i>
          Edit: {student?.first_name} {student?.last_name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3 px-4">
        {student && (
          <Form id="editStudentForm" onSubmit={handleSave}>
            <Row className="mb-3">
              <Form.Group as={Col} xs={12} md={6} controlId="editFirstName">
                <Form.Label className="small mb-1">First Name <span className="text-danger">*</span></Form.Label>
                <Form.Control size="sm" type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
              </Form.Group>
              <Form.Group as={Col} xs={12} md={6} controlId="editLastName" className="mt-2 mt-md-0">
                <Form.Label className="small mb-1">Last Name <span className="text-danger">*</span></Form.Label>
                <Form.Control size="sm" type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
              </Form.Group>
            </Row>
            {/* Email & Phone */}
            <Row className="mb-3">
              <Form.Group as={Col} xs={12} md={6} controlId="editEmail">
                <Form.Label className="small mb-1">Email <span className="text-danger">*</span></Form.Label>
                <Form.Control size="sm" type="email" value={formData.mail_id} onChange={(e) => setFormData({ ...formData, mail_id: e.target.value })} required />
              </Form.Group>
               <Form.Group as={Col} xs={12} md={6} controlId="editPhone">
                <Form.Label className="small mb-1">Phone <span className="text-danger">*</span></Form.Label>
                <Form.Control size="sm" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
              </Form.Group>
            </Row>
            {/* Address */}
            <Form.Group className="mb-3" controlId="editAddress">
               <Form.Label className="small mb-1">Address</Form.Label>
               <Form.Control size="sm" type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </Form.Group>
            {/* Mandal & Mukt */}
             <Row className="mb-3">
                 <Form.Group as={Col} xs={12} md={6} controlId="editMandal">
                   <Form.Label className="small mb-1">Mandal</Form.Label>
                   <Form.Select size="sm" value={formData.mandal_name} onChange={(e) => setFormData({...formData, mandal_name: e.target.value})}>
                      <option value="">Select Mandal</option>
                      {MANDAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </Form.Select>
                 </Form.Group>
                 <Form.Group as={Col} xs={12} md={6} controlId="editMukt">
                   <Form.Label className="small mb-1">Mukt Type</Form.Label>
                   <Form.Select size="sm" value={formData.mukt_type} onChange={(e) => setFormData({...formData, mukt_type: e.target.value})}>
                      <option value="">Select Type</option>
                      {MUKT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </Form.Select>
                 </Form.Group>
              </Row>
            {/* Study Info */}
            <Row className="mb-3">
                 <Form.Group as={Col} xs={12} md={3}>
                   <Form.Label className="small mb-1">Date of Birth</Form.Label>
                   <Form.Control size="sm" type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                 </Form.Group>
                 <Form.Group as={Col} xs={12} md={3}>
                   <Form.Label className="small mb-1">Gender</Form.Label>
                   <Form.Select size="sm" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                     <option value="">Select</option>
                     <option value="male">Male</option>
                     <option value="female">Female</option>
                   </Form.Select>
                 </Form.Group>
                 <Form.Group as={Col} xs={12} md={3}>
                   <Form.Label className="small mb-1">Institution</Form.Label>
                   <Form.Select size="sm" value={formData.study_institution} onChange={(e) => handleInstitutionChange(e.target.value)}>
                     <option value="">Select</option>
                     {INSTITUTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                   </Form.Select>
                 </Form.Group>
                 <Form.Group as={Col} xs={12} md={3}>
                   <Form.Label className="small mb-1">Program</Form.Label>
                   <Form.Select size="sm" value={formData.study_program} onChange={(e) => handleProgramChange(e.target.value)} disabled={!formData.study_institution}>
                     <option value="">Select</option>
                     {availablePrograms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                   </Form.Select>
                 </Form.Group>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} xs={12} md={availableSpecializations.length ? 6 : 12}>
                  <Form.Label className="small mb-1">Specialization</Form.Label>
                  {availableSpecializations.length ? (
                    <Form.Select size="sm" value={formData.study_specialization} onChange={(e) => setFormData({...formData, study_specialization: e.target.value})}>
                      <option value="">Select</option>
                      {availableSpecializations.map(s => <option key={s} value={s}>{s}</option>)}
                    </Form.Select>
                  ) : (
                    <Form.Control size="sm" type="text" value={formData.study_specialization} onChange={(e) => setFormData({...formData, study_specialization: e.target.value})} disabled={!formData.study_program} />
                  )}
              </Form.Group>
               <Form.Group as={Col} xs={12} md={availableSpecializations.length ? 6 : 12}>
                   <Form.Label className="small mb-1">Summary</Form.Label>
                   <Form.Control size="sm" type="text" value={studySummary || formData.study || ''} readOnly />
               </Form.Group>
            </Row>

             {/* Graduation */}
            <Row className="mb-3">
              <Form.Group as={Col} xs={12} md={4}>
                  <Form.Check label="Graduation completed?" checked={!!formData.graduation_completed} onChange={(e) => setFormData({...formData, graduation_completed: e.target.checked})} />
              </Form.Group>
              <Form.Group as={Col} xs={12} md={4}>
                  <Form.Label className="small mb-1">Graduation Date</Form.Label>
                  <Form.Control size="sm" type="date" value={formData.graduation_date} onChange={(e) => setFormData({...formData, graduation_date: e.target.value})} disabled={!formData.graduation_completed} />
              </Form.Group>
              <Form.Group as={Col} xs={12} md={4}>
                  <Form.Label className="small mb-1">Post-Grad Plan</Form.Label>
                  <Form.Select size="sm" value={formData.post_graduation_plan} onChange={(e) => handlePostGradPlanChange(e.target.value)}>
                    <option value="">Select</option>
                    {POST_GRAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Form.Select>
              </Form.Group>
            </Row>

            {showEmploymentFields && (
                 <Row className="mb-3">
                    <Form.Group as={Col} xs={12} md={6} controlId="editEmploymentCompany">
                    <Form.Label className="small mb-1">Company</Form.Label>
                    <Form.Control size="sm" type="text" value={formData.employment_company} onChange={(e) => setFormData({...formData, employment_company: e.target.value})} />
                    </Form.Group>
                    <Form.Group as={Col} xs={12} md={6} controlId="editEmploymentRole">
                    <Form.Label className="small mb-1">Role</Form.Label>
                    <Form.Control size="sm" type="text" value={formData.employment_role} onChange={(e) => setFormData({...formData, employment_role: e.target.value})} />
                    </Form.Group>
                 </Row>
            )}

            {/* Admin Toggle (Visible only to Super Admin or specific phone) */}
            {currentUser && (currentUser.isSuper || currentUser.phone === '5199927920') && (
               <div className="alert alert-warning mb-3">
                   <Form.Check
                     type="switch"
                     id="admin-switch"
                     label={<strong>Grant Admin Access</strong>}
                     checked={formData.is_admin}
                     onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                   />
                   <div className="small text-muted mt-1">
                     Enabling this will give the user Admin access to the Student Portal (based on their Mandal).
                   </div>
               </div>
            )}

            {/* Moved Out & Events intentionally simplified for brevity but can be expanded */}
             <Form.Group className="mb-3">
                <Form.Label className="small mb-1">Notes</Form.Label>
                <Form.Control as="textarea" rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
             </Form.Group>

          </Form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide} disabled={isSaving}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" form="editStudentForm" disabled={isSaving || !student}>
           {isSaving ? <><Spinner size="sm" animation="border" /> Saving...</> : 'Save Changes'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
