// pages/add-yuvak.js
import { useMemo, useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/router';
import { useNotification } from '../contexts/NotificationContext';

const interestOptions = [
  'Sports', 'Music', 'Reading', 'Art', 'Technology',
  'Science', 'Travel', 'Cooking', 'Photography', 'Dance'
];

const INSTITUTION_OPTIONS = [
  { value: 'uwindsor', label: 'University of Windsor' },
  { value: 'st_clair', label: 'St. Clair College' },
  { value: 'other', label: 'Other' }
];

const PROGRAM_LIBRARY = {
  uwindsor: [
    { value: 'masters_applied_computing', label: 'Masters of Applied Computing', level: 'masters' },
    { value: 'meng', label: 'Master of Engineering (MEng)', level: 'meng', specializations: ['Civil', 'ECE', 'Mechanical', 'Automobile'] },
    { value: 'mba', label: 'MBA', level: 'mba' },
    { value: 'msc', label: 'MSc', level: 'msc' },
    { value: 'uwindsor_other', label: 'Other Windsor Program', level: 'other' }
  ],
  st_clair: [
    { value: 'pg_business', label: 'Business', level: 'pg_diploma' },
    { value: 'pg_international_business_management', label: 'International Business Management', level: 'pg_diploma' },
    { value: 'pg_data_analytics', label: 'Data Analytics', level: 'pg_diploma' },
    { value: 'pg_predictive_data_analytics', label: 'Predictive Data Analytics', level: 'pg_diploma' },
    { value: 'pg_cybersecurity', label: 'Cybersecurity & IT Security', level: 'pg_diploma' },
    { value: 'pg_supply_chain', label: 'Supply Chain Management & Logistics', level: 'pg_diploma' },
    { value: 'pg_construction_project_management', label: 'Construction Project Management', level: 'pg_diploma' },
    { value: 'pg_health_care', label: 'Health Care Programs', level: 'pg_diploma', specializations: ['Nursing', 'Medical Laboratory', 'Fitness & Health Promotion', 'Occupational Therapist Assistant'] },
    { value: 'pg_engineering_technology', label: 'Engineering Technology', level: 'pg_diploma', specializations: ['Civil', 'Mechanical', 'Electrical', 'Biomedical'] },
    { value: 'pg_skilled_trades', label: 'Skilled Trades', level: 'pg_diploma', specializations: ['Carpentry', 'Welding', 'Plumbing', 'Refrigeration', 'Greenhouse Technician', 'Landscape Horticulture'] },
    { value: 'st_clair_other', label: 'Other St. Clair Program', level: 'pg_diploma' }
  ],
  other: [
    { value: 'other_program', label: 'Other Program', level: 'other' }
  ]
};

const POST_GRAD_OPTIONS = [
  { value: 'working', label: 'Working' },
  { value: 'job_search', label: 'Job Searching' },
  { value: 'higher_studies', label: 'Higher Studies' },
  { value: 'entrepreneur', label: 'Entrepreneurship' },
  { value: 'other', label: 'Other' }
];

const getProgramDefinition = (institution, programValue) => {
  const options = PROGRAM_LIBRARY[institution] || [];
  return options.find(program => program.value === programValue) || null;
};

export default function AddYuvak() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mail_id: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    education: '',
    study_level: '',
    study_institution: '',
    study_program: '',
    study_specialization: '',
    study: '',
    box_cricket: false,
    box_cricket_years: [],
    atmiya_cricket_tournament: false,
    atmiya_cricket_years: [],
    atmiya_youth_shibir: false,
    atmiya_youth_years: [],
    yuva_mahotsav: false,
    yuva_mahotsav_years: [],
    harimay: false,
    emergency_contact: '',
    profile_picture: null,
    notes: '',
    interests: [],
    graduation_completed: false,
    graduation_date: '',
    post_graduation_plan: '',
    employment_status: '',
    employment_company: '',
    employment_role: '',
    moved_out: false,
    moved_out_date: '',
    moved_out_job: '',
    moved_out_address: '',
    moved_out_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const { show: showToast } = useNotification();
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const router = useRouter();

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

  const studySummaryDisplay = useMemo(() => {
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

  // Validate form data for each step
  const validateForm = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
      if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
      if (!formData.mail_id.trim()) {
        newErrors.mail_id = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.mail_id)) {
        newErrors.mail_id = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    }
    if (currentStep === 2) {
      if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.study_institution) newErrors.study_institution = 'Please select a study institution';
      if (!formData.study_program) newErrors.study_program = 'Please select a study program';
      if (
        availableSpecializations.length > 0 &&
        !formData.study_specialization.trim()
      ) {
        newErrors.study_specialization = 'Please choose a specialization for the selected program';
      }
      if (formData.box_cricket && (!formData.box_cricket_years || formData.box_cricket_years.length === 0)) {
        newErrors.box_cricket_years = 'Please specify at least one year for Box Cricket';
      }
      if (formData.atmiya_cricket_tournament && (!formData.atmiya_cricket_years || formData.atmiya_cricket_years.length === 0)) {
        newErrors.atmiya_cricket_years = 'Please specify at least one year for Atmiya Cricket Tournament';
      }
      if (formData.atmiya_youth_shibir && (!formData.atmiya_youth_years || formData.atmiya_youth_years.length === 0)) {
        newErrors.atmiya_youth_years = 'Please specify at least one year for Atmiya Youth Shibir';
      }
      if (formData.yuva_mahotsav && (!formData.yuva_mahotsav_years || formData.yuva_mahotsav_years.length === 0)) {
        newErrors.yuva_mahotsav_years = 'Please specify at least one year for Yuva Mahotsav (India)';
      }
    }
    if (currentStep === 3) {
      if (formData.graduation_completed && !formData.graduation_date) {
        newErrors.graduation_date = 'Please provide the graduation completion date';
      }
      if (formData.post_graduation_plan === 'working') {
        if (!formData.employment_company.trim()) {
          newErrors.employment_company = 'Please enter the company name';
        }
        if (!formData.employment_role.trim()) {
          newErrors.employment_role = 'Please enter the role/title';
        }
      }
      if (formData.moved_out && !formData.moved_out_date) {
        newErrors.moved_out_date = 'Please provide the move-out date';
      }
    }
    setError(Object.keys(newErrors).length > 0 ? Object.values(newErrors).join('\n') : null);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes (including interests and file preview)
  const handleChange = (e) => {
    const { id, value, type, checked, files, name } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, profile_picture: file }));
        const reader = new FileReader();
        reader.onloadend = () => { setPreviewUrl(reader.result); };
        reader.readAsDataURL(file);
      }
    } else if (type === 'checkbox') {
      if (id === 'interests' || name === 'interests') {
        const updatedInterests = checked 
          ? [...formData.interests, value] 
          : formData.interests.filter(interest => interest !== value);
        setFormData(prev => ({ ...prev, interests: updatedInterests }));
      } else {
        setFormData(prev => ({ ...prev, [id]: checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    // Clear error for this field when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Tag input handler for years
  const handleYearTagInput = (e, field) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const value = e.target.value.trim().replace(/,$/, '');
      if (value && !formData[field].includes(value)) {
        setFormData(prev => ({ ...prev, [field]: [...prev[field], value] }));
      }
      e.target.value = '';
    }
  };
  const removeYearTag = (field, year) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter(y => y !== year) }));
  };

  const handleInstitutionChange = (value) => {
    setFormData(prev => ({
      ...prev,
      study_institution: value,
      study_program: '',
      study_specialization: '',
      study_level: '',
      education: '',
      study: ''
    }));
    if (error) {
      setError(null);
    }
  };

  const handleProgramChange = (value) => {
    const definition = getProgramDefinition(formData.study_institution, value);
    setFormData(prev => ({
      ...prev,
      study_program: value,
      study_level: definition?.level || '',
      education: definition?.level || prev.education,
      study_specialization: '',
      study: definition?.label || ''
    }));
    if (error) {
      setError(null);
    }
  };

  const handleGraduationToggle = (checked) => {
    setFormData(prev => ({
      ...prev,
      graduation_completed: checked,
      graduation_date: checked ? prev.graduation_date : ''
    }));
    if (error) {
      setError(null);
    }
  };

  const handlePostGradPlanChange = (value) => {
    setFormData(prev => ({
      ...prev,
      post_graduation_plan: value,
      employment_status: value,
      ...(value !== 'working' ? { employment_company: '', employment_role: '' } : {})
    }));
    if (error) {
      setError(null);
    }
  };

  const handleMovedOutToggle = (checked) => {
    setFormData(prev => ({
      ...prev,
      moved_out: checked,
      ...(checked
        ? {}
        : {
            moved_out_date: '',
            moved_out_job: '',
            moved_out_address: '',
            moved_out_notes: ''
          })
    }));
    if (error) {
      setError(null);
    }
  };

  const interceptEnterKey = (e) => {
    if (e.key !== 'Enter') return;
    const targetTag = (e.target.tagName || '').toLowerCase();
    if (targetTag === 'textarea') return;
    if (e.target.getAttribute('data-allow-enter') === 'true') return;
    e.preventDefault();
    if (typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (e.type === 'keydown' && step < 3) {
      handleNextStep();
    }
  };

  // Handle multi-step navigation
  const handleNextStep = () => {
    if (validateForm(step)) {
      setStep(prev => prev + 1);
    }
  };
  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  // Handle final form submission
  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      if (typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
    }
    if (loading) return;
    setLoading(true);
    setError(null);

    const requiredFieldLabels = {
      first_name: 'First name',
      last_name: 'Last name',
      mail_id: 'Email',
      phone: 'Phone number',
      date_of_birth: 'Date of birth',
      gender: 'Gender',
      study_institution: 'Study institution',
      study_program: 'Study program'
    };

    const requiredFields = Object.keys(requiredFieldLabels);
    const missingFields = requiredFields.filter((field) => {
      const value = formData[field];
      if (typeof value === 'string') {
        return value.trim() === '';
      }
      return !value;
    });

    if (missingFields.length > 0) {
      const friendlyNames = missingFields.map((field) => requiredFieldLabels[field]).join(', ');
      setError(`Please fill in all required fields: ${friendlyNames}`);
      setLoading(false);
      return;
    }

    const selectedProgram = getProgramDefinition(formData.study_institution, formData.study_program);
    const baseEducation = (formData.education || '').trim();
    const derivedLevel = selectedProgram?.level || formData.study_level || baseEducation;
    const specializationLabel = (formData.study_specialization || '').trim();
    const studyLabelParts = [];
    if (selectedProgram) studyLabelParts.push(selectedProgram.label);
    if (specializationLabel) studyLabelParts.push(specializationLabel);
    const studyDisplay = studyLabelParts.join(' - ') || (formData.study || '').trim();

    if (!studyDisplay) {
      setError('Please select a study institution and program for the yuvak.');
      setLoading(false);
      return;
    }

    const cleanedData = {
      first_name: (formData.first_name || '').trim(),
      last_name: (formData.last_name || '').trim(),
      mail_id: (formData.mail_id || '').trim().toLowerCase(),
      phone: (formData.phone || '').trim(),
      address: formData.address?.trim() || '',
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || '',
      education: derivedLevel || baseEducation,
      study_level: derivedLevel || baseEducation,
      study_institution: formData.study_institution || '',
      study_program: formData.study_program || '',
      study_specialization: specializationLabel,
      study: studyDisplay,
      box_cricket: formData.box_cricket,
      box_cricket_years: formData.box_cricket ? formData.box_cricket_years : [],
      atmiya_cricket_tournament: formData.atmiya_cricket_tournament,
      atmiya_cricket_years: formData.atmiya_cricket_tournament ? formData.atmiya_cricket_years : [],
      atmiya_youth_shibir: formData.atmiya_youth_shibir,
      atmiya_youth_years: formData.atmiya_youth_shibir ? formData.atmiya_youth_years : [],
      yuva_mahotsav: formData.yuva_mahotsav,
      yuva_mahotsav_years: formData.yuva_mahotsav ? formData.yuva_mahotsav_years : [],
      harimay: formData.harimay,
      emergency_contact: formData.emergency_contact?.trim() || '',
      notes: formData.notes?.trim() || '',
      graduation_completed: !!formData.graduation_completed,
      graduation_date: formData.graduation_completed && formData.graduation_date ? formData.graduation_date : '',
      post_graduation_plan: formData.post_graduation_plan || '',
      employment_status: formData.post_graduation_plan || '',
      employment_company: showEmploymentFields ? (formData.employment_company || '').trim() : '',
      employment_role: showEmploymentFields ? (formData.employment_role || '').trim() : '',
      moved_out: !!formData.moved_out,
      moved_out_date: formData.moved_out ? formData.moved_out_date : '',
      moved_out_job: formData.moved_out ? (formData.moved_out_job || '').trim() : '',
      moved_out_address: formData.moved_out ? (formData.moved_out_address || '').trim() : '',
      moved_out_notes: formData.moved_out ? (formData.moved_out_notes || '').trim() : ''
    };

    try {
      console.log('Submitting data to API:', JSON.stringify(cleanedData));

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(cleanedData)
      });

      const text = await response.text();
      let result = {};
      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error('Failed to parse server response');
        }
      }

      if (!response.ok) {
        if (result.error && result.error.includes('Email already exists')) {
          setError(`A yuvak with email "${cleanedData.mail_id}" appears to already exist in the database. Please use a different email address.`);
          setLoading(false);
          return;
        }
        throw new Error(result.error || 'Failed to add yuvak');
      }

      showToast('Yuvak added successfully', 'success');
      router.push('/students-table');
    } catch (err) {
      console.error('Error adding yuvak:', err);
      setError(err.message || 'Failed to add yuvak. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Display toast notification (removed local implementation)

  // Render form content for the current step
  const renderFormStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">First Name <span className="text-danger">*</span></label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-user"></i></span>
                  <input
                    type="text"
                    className={`form-control ${error && error.includes('First name') ? 'is-invalid' : ''}`}
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                  {error && error.includes('First name') && (
                    <div className="invalid-feedback">{error}</div>
                  )}
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Last Name <span className="text-danger">*</span></label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-user"></i></span>
                  <input
                    type="text"
                    className={`form-control ${error && error.includes('Last name') ? 'is-invalid' : ''}`}
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                  {error && error.includes('Last name') && (
                    <div className="invalid-feedback">{error}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                  <input
                    type="email"
                    className={`form-control ${error && error.includes('Email') ? 'is-invalid' : ''}`}
                    id="mail_id"
                    value={formData.mail_id}
                    onChange={handleChange}
                    required
                  />
                  {error && error.includes('Email') && (
                    <div className="invalid-feedback">{error}</div>
                  )}
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Phone <span className="text-danger">*</span></label>
                <div className="input-group">
                  <span className="input-group-text"><i className="fas fa-phone"></i></span>
                  <input
                    type="tel"
                    className={`form-control ${error && error.includes('Phone number') ? 'is-invalid' : ''}`}
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                  {error && error.includes('Phone number') && (
                    <div className="invalid-feedback">{error}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Address</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-map-marker-alt"></i></span>
                <textarea
                  className="form-control"
                  id="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                ></textarea>
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className={`form-control ${error && error.includes('Date of birth') ? 'is-invalid' : ''}`}
                  id="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                />
                {error && error.includes('Date of birth') && (
                  <div className="invalid-feedback">{error}</div>
                )}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Gender <span className="text-danger">*</span></label>
                <select
                  id="gender"
                  className={`form-select ${error && error.includes('Gender') ? 'is-invalid' : ''}`}
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {error && error.includes('Gender') && (
                  <div className="invalid-feedback">Gender is required</div>
                )}
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Study Institution <span className="text-danger">*</span></label>
                <select
                  id="study_institution"
                  className={`form-select ${error && error.includes('study institution') ? 'is-invalid' : ''}`}
                  value={formData.study_institution}
                  onChange={(e) => handleInstitutionChange(e.target.value)}
                >
                  <option value="">Select Institution</option>
                  {INSTITUTION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {error && error.includes('study institution') && (
                  <div className="invalid-feedback">Please select a study institution</div>
                )}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Study Program <span className="text-danger">*</span></label>
                <select
                  id="study_program"
                  className={`form-select ${error && error.includes('study program') ? 'is-invalid' : ''}`}
                  value={formData.study_program}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  disabled={!formData.study_institution}
                >
                  <option value="">Select Program</option>
                  {availablePrograms.map(program => (
                    <option key={program.value} value={program.value}>{program.label}</option>
                  ))}
                </select>
                {error && error.includes('study program') && (
                  <div className="invalid-feedback">Please select a study program</div>
                )}
              </div>
            </div>
            {availableSpecializations.length > 0 ? (
              <div className="mb-3">
                <label className="form-label">Specialization <span className="text-danger">*</span></label>
                <select
                  id="study_specialization"
                  className={`form-select ${error && error.includes('specialization') ? 'is-invalid' : ''}`}
                  value={formData.study_specialization}
                  onChange={handleChange}
                >
                  <option value="">Select Specialization</option>
                  {availableSpecializations.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {error && error.includes('specialization') && (
                  <div className="invalid-feedback">Please choose a specialization</div>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label">Specialization / Details (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  id="study_specialization"
                  value={formData.study_specialization}
                  onChange={handleChange}
                  placeholder="Enter specialization or additional details"
                />
              </div>
            )}
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Education</label>
                <select
                  id="education"
                  className="form-select"
                  value={formData.education}
                  onChange={handleChange}
                >
                  <option value="">Select Education</option>
                  <option value="high_school">High School</option>
                  <option value="bachelors">Bachelors</option>
                  <option value="masters">Masters</option>
                  <option value="phd">PhD</option>
                  <option value="pg_diploma">Post Graduate Diploma</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Study Summary</label>
                <input
                  type="text"
                  className="form-control"
                  value={studySummaryDisplay || formData.study || ''}
                  placeholder="Summary appears after selecting program"
                  readOnly
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Events Participation</label>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="box_cricket"
                  checked={formData.box_cricket}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="box_cricket">
                  Box Cricket
                </label>
                {formData.box_cricket && (
                  <div className="mt-2">
                    <div className="d-flex flex-wrap gap-2">
                      {formData.box_cricket_years.map((year, idx) => (
                        <span key={year + idx} className="badge bg-primary rounded-pill px-3 py-2 d-flex align-items-center">
                          {year}
                          <button type="button" className="btn-close btn-close-white ms-2" style={{ fontSize: '0.7rem' }} aria-label="Remove" onClick={() => removeYearTag('box_cricket_years', year)}></button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={`form-control mt-2 ${error && error.includes('box_cricket_years') ? 'is-invalid' : ''}`}
                      id="box_cricket_years_input"
                      placeholder="Type year and press Enter"
                      data-allow-enter="true"
                      onKeyDown={e => handleYearTagInput(e, 'box_cricket_years')}
                    />
                  </div>
                )}
              </div>
              <div className="form-check mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="atmiya_cricket_tournament"
                  checked={formData.atmiya_cricket_tournament}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="atmiya_cricket_tournament">
                  Atmiya Cricket Tournament
                </label>
                {formData.atmiya_cricket_tournament && (
                  <div className="mt-2">
                    <div className="d-flex flex-wrap gap-2">
                      {formData.atmiya_cricket_years.map((year, idx) => (
                        <span key={year + idx} className="badge bg-primary rounded-pill px-3 py-2 d-flex align-items-center">
                          {year}
                          <button type="button" className="btn-close btn-close-white ms-2" style={{ fontSize: '0.7rem' }} aria-label="Remove" onClick={() => removeYearTag('atmiya_cricket_years', year)}></button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={`form-control mt-2 ${error && error.includes('atmiya_cricket_years') ? 'is-invalid' : ''}`}
                      id="atmiya_cricket_years_input"
                      placeholder="Type year and press Enter"
                      data-allow-enter="true"
                      onKeyDown={e => handleYearTagInput(e, 'atmiya_cricket_years')}
                    />
                  </div>
                )}
              </div>
              <div className="form-check mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="atmiya_youth_shibir"
                  checked={formData.atmiya_youth_shibir}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="atmiya_youth_shibir">
                  Atmiya Youth Shibir
                </label>
                {formData.atmiya_youth_shibir && (
                  <div className="mt-2">
                    <div className="d-flex flex-wrap gap-2">
                      {formData.atmiya_youth_years.map((year, idx) => (
                        <span key={year + idx} className="badge bg-primary rounded-pill px-3 py-2 d-flex align-items-center">
                          {year}
                          <button type="button" className="btn-close btn-close-white ms-2" style={{ fontSize: '0.7rem' }} aria-label="Remove" onClick={() => removeYearTag('atmiya_youth_years', year)}></button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={`form-control mt-2 ${error && error.includes('atmiya_youth_years') ? 'is-invalid' : ''}`}
                      id="atmiya_youth_years_input"
                      placeholder="Type year and press Enter"
                      data-allow-enter="true"
                      onKeyDown={e => handleYearTagInput(e, 'atmiya_youth_years')}
                    />
                  </div>
                )}
              </div>
              <div className="form-check mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="yuva_mahotsav"
                  checked={formData.yuva_mahotsav}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="yuva_mahotsav">
                  Yuva Mahotsav (India)
                </label>
                {formData.yuva_mahotsav && (
                  <div className="mt-2">
                    <div className="d-flex flex-wrap gap-2">
                      {formData.yuva_mahotsav_years.map((year, idx) => (
                        <span key={year + idx} className="badge bg-primary rounded-pill px-3 py-2 d-flex align-items-center">
                          {year}
                          <button type="button" className="btn-close btn-close-white ms-2" style={{ fontSize: '0.7rem' }} aria-label="Remove" onClick={() => removeYearTag('yuva_mahotsav_years', year)}></button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={`form-control mt-2 ${error && error.includes('yuva_mahotsav_years') ? 'is-invalid' : ''}`}
                      id="yuva_mahotsav_years_input"
                      placeholder="Type year and press Enter"
                      data-allow-enter="true"
                      onKeyDown={e => handleYearTagInput(e, 'yuva_mahotsav_years')}
                    />
                  </div>
                )}
              </div>
              <div className="form-check mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="harimay"
                  checked={formData.harimay}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="harimay">
                  Harimay
                </label>
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="graduation_completed"
                    checked={formData.graduation_completed}
                    onChange={(e) => handleGraduationToggle(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="graduation_completed">
                    Graduation Completed?
                  </label>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Graduation Date</label>
                <input
                  type="date"
                  className={`form-control ${error && error.includes('graduation completion date') ? 'is-invalid' : ''}`}
                  id="graduation_date"
                  value={formData.graduation_date}
                  onChange={handleChange}
                  disabled={!formData.graduation_completed}
                />
                {error && error.includes('graduation completion date') && (
                  <div className="invalid-feedback">Please provide the graduation completion date</div>
                )}
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Post-Graduation Plan</label>
                <select
                  id="post_graduation_plan"
                  className="form-select"
                  value={formData.post_graduation_plan}
                  onChange={(e) => handlePostGradPlanChange(e.target.value)}
                >
                  <option value="">Select plan</option>
                  {POST_GRAD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {showEmploymentFields && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Company / Organization <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${error && error.includes('company name') ? 'is-invalid' : ''}`}
                    id="employment_company"
                    value={formData.employment_company}
                    onChange={handleChange}
                    placeholder="Where are they working?"
                  />
                  {error && error.includes('company name') && (
                    <div className="invalid-feedback">Please enter the company name</div>
                  )}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Role / Title <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${error && error.includes('role/title') ? 'is-invalid' : ''}`}
                    id="employment_role"
                    value={formData.employment_role}
                    onChange={handleChange}
                    placeholder="Job role or designation"
                  />
                  {error && error.includes('role/title') && (
                    <div className="invalid-feedback">Please enter the role/title</div>
                  )}
                </div>
              </div>
            )}
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="moved_out"
                checked={formData.moved_out}
                onChange={(e) => handleMovedOutToggle(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="moved_out">
                Mark as moved out?
              </label>
            </div>
            {formData.moved_out && (
              <>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Move-out Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className={`form-control ${error && error.includes('move-out date') ? 'is-invalid' : ''}`}
                      id="moved_out_date"
                      value={formData.moved_out_date}
                      onChange={handleChange}
                    />
                    {error && error.includes('move-out date') && (
                      <div className="invalid-feedback">Please provide the move-out date</div>
                    )}
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">New Job / Program</label>
                    <input
                      type="text"
                      className="form-control"
                      id="moved_out_job"
                      value={formData.moved_out_job}
                      onChange={handleChange}
                      placeholder="New job or program"
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">New Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="moved_out_address"
                      value={formData.moved_out_address}
                      onChange={handleChange}
                      placeholder="New address after moving out"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Move-out Notes</label>
                  <textarea
                    className="form-control"
                    id="moved_out_notes"
                    rows="2"
                    value={formData.moved_out_notes}
                    onChange={handleChange}
                    placeholder="Any additional move-out details"
                  ></textarea>
                </div>
              </>
            )}
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Profile Picture (Optional)</label>
                <input className="form-control" type="file" id="profile_picture" onChange={handleChange} />
                {previewUrl && (
                  <div className="mt-3">
                    <img src={previewUrl} alt="Profile Preview" className="img-thumbnail" style={{ maxWidth: '150px' }} />
                  </div>
                )}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Emergency Contact</label>
                <input
                  type="tel"
                  className="form-control"
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                  placeholder="Emergency contact number"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                id="notes"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes or details"
              />
            </div>
            {interestOptions.length > 0 && (
              <div className="mb-3">
                <label className="form-label">Interests (Optional)</label>
                <div className="d-flex flex-wrap gap-3">
                  {interestOptions.map(option => {
                    const interestId = `interest-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    return (
                      <div className="form-check" key={option}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={interestId}
                          name="interests"
                          value={option}
                          checked={formData.interests.includes(option)}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor={interestId}>{option}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Add Yuvak - HSAPSS Windsor</title>
      </Head>

      <Navbar />

      <main className="main-content">
        <div className="container mt-5">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-user-plus me-2"></i>Add New Yuvak
              </h5>
              <div className="progress mt-3">
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${(step / 3) * 100}%` }}
                  aria-valuenow={(step / 3) * 100}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <small>Step {step} of 3</small>
                <small>{step === 1 ? 'Basic Info' : step === 2 ? 'Personal Details' : 'Additional Info'}</small>
              </div>
            </div>
            <div className="card-body">
              <form
                onSubmit={(event) => event.preventDefault()}
                onKeyDown={interceptEnterKey}
                onKeyUp={interceptEnterKey}
                noValidate
              >
                {renderFormStep()}
                {error && (
                  <div className="alert alert-danger mt-3" role="alert">
                    {error}
                  </div>
                )}
                <div className="d-flex justify-content-between mt-4">
                  {step > 1 && (
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary" 
                      onClick={handlePrevStep}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Previous
                    </button>
                  )}
                  {step < 3 ? (
                    <button 
                      type="button" 
                      className="btn btn-primary ms-auto"
                      onClick={handleNextStep}
                    >
                      Next
                      <i className="fas fa-arrow-right ms-2"></i>
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-success ms-auto"
                      disabled={loading}
                      onClick={handleSubmit}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Save Yuvak
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>



      {/* Debugging Information (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="container mt-5 d-none">
          <div className="card">
            <div className="card-header bg-secondary text-white">
              <h6 className="mb-0">Debug Information</h6>
            </div>
            <div className="card-body">
              <pre>{JSON.stringify(formData, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export async function getServerSideProps(ctx) {
  const { requireAdminPage } = await import('../lib/adminPage.js');
  return requireAdminPage(ctx);
}
