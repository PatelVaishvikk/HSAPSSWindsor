import { useState } from 'react';
import Head from 'next/head';

const DEFAULT_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  date_of_birth: '',
  address_street: '',
  apartment_number: '',
  address_city: '',
  address_state: '',
  address: '',
  mandal_name: ''
};

const MANDAL_OPTIONS = [
  'Windsor',
  'Brampton',
  'Mississauga',
  'Etobicoke',
  'Kitchener',
  'London',
  'Hamilton',
  'Other'
];

const normalizePhoneDigits = (value) =>
  typeof value === 'string' ? value.replace(/\D+/g, '') : '';

export default function YuvakDetails() {
  const [lookupPhone, setLookupPhone] = useState('');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [profileName, setProfileName] = useState('');
  const [profileExists, setProfileExists] = useState(false);
  const [stage, setStage] = useState('lookup');
  const [missingFields, setMissingFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLookup = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (normalizePhoneDigits(lookupPhone).length < 10) {
      setError('Enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/public-yuvak-details/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lookupPhone })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to check this phone number.');
      }

      if (!result.exists) {
        setFormData({ ...DEFAULT_FORM, phone: lookupPhone });
        setProfileName('');
        setProfileExists(false);
        setMissingFields(result.missingFields || []);
        setStage('form');
        setMessage('No existing profile found. Add your name and current details.');
        return;
      }

      const profile = { ...DEFAULT_FORM, ...(result.profile || {}) };
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || lookupPhone,
        date_of_birth: profile.date_of_birth || '',
        address_street: profile.address_street || profile.address || '',
        apartment_number: profile.apartment_number || '',
        address_city: profile.address_city || '',
        address_state: profile.address_state || '',
        address: profile.address || '',
        mandal_name: profile.mandal_name || ''
      });
      setProfileName([profile.first_name, profile.last_name].filter(Boolean).join(' '));
      setProfileExists(true);
      setMissingFields(result.missingFields || []);
      setStage('form');
      setMessage('Profile found. Please confirm these details.');
    } catch (lookupError) {
      setError(lookupError.message || 'Unable to check this phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError('');
    setMessage('');
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    const errors = [];
    if (!profileExists && !formData.first_name.trim()) errors.push('First name is required');
    if (!profileExists && !formData.last_name.trim()) errors.push('Last name is required');
    if (normalizePhoneDigits(formData.phone).length < 10) errors.push('Phone number is required');
    if (!formData.date_of_birth) errors.push('Birthdate is required');
    if (!formData.address_street.trim()) errors.push('Street address is required');
    if (!formData.address_city.trim()) errors.push('City is required');
    if (!formData.address_state.trim()) errors.push('State / Province is required');
    if (!formData.mandal_name.trim()) errors.push('Mandal is required');
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/public-yuvak-details/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lookup_phone: lookupPhone,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          address_street: formData.address_street.trim(),
          apartment_number: formData.apartment_number.trim(),
          address_city: formData.address_city.trim(),
          address_state: formData.address_state.trim(),
          mandal_name: formData.mandal_name.trim()
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to save details.');
      }

      setMissingFields([]);
      setProfileExists(true);
      setMessage(result.status === 'created' ? 'Profile created successfully.' : 'Details updated successfully.');
      if (result.profile) {
        setFormData({
          first_name: result.profile.first_name || formData.first_name,
          last_name: result.profile.last_name || formData.last_name,
          phone: result.profile.phone || lookupPhone,
          date_of_birth: result.profile.date_of_birth || '',
          address_street: result.profile.address_street || '',
          apartment_number: result.profile.apartment_number || '',
          address_city: result.profile.address_city || '',
          address_state: result.profile.address_state || '',
          address: result.profile.address || '',
          mandal_name: result.profile.mandal_name || ''
        });
        setProfileName([result.profile.first_name, result.profile.last_name].filter(Boolean).join(' '));
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to save details.');
    } finally {
      setSaving(false);
    }
  };

  const resetLookup = () => {
    setLookupPhone('');
    setFormData(DEFAULT_FORM);
    setProfileName('');
    setProfileExists(false);
    setStage('lookup');
    setMissingFields([]);
    setMessage('');
    setError('');
  };

  return (
    <>
      <Head>
        <title>Yuvak Details - HSAPSS Windsor</title>
      </Head>

      <main className="details-page">
        <header className="page-header">
          <div className="brand">
            <img src="/windsor.jpg" alt="HSAPSS Windsor" />
            <div>
              <p>HSAPSS Windsor</p>
              <h1>Yuvak Details</h1>
            </div>
          </div>
          <span>Public form</span>
        </header>

        <section className="panel">
          <form className="lookup-form" onSubmit={handleLookup}>
            <div>
              <label htmlFor="lookupPhone">Phone number</label>
              <input
                id="lookupPhone"
                type="tel"
                value={lookupPhone}
                onChange={(event) => setLookupPhone(event.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Find profile'}
            </button>
          </form>

          {(error || message) && (
            <div className={error ? 'notice error' : 'notice success'} aria-live="polite">
              {error || message}
            </div>
          )}

          {stage === 'form' && (
            <form className="details-form" onSubmit={handleSubmit}>
              <div className="form-heading">
                <div>
                  <p>{profileExists ? 'Profile found' : 'New profile'}</p>
                  <h2>{profileName || 'Yuvak profile'}</h2>
                </div>
                <button type="button" className="text-button" onClick={resetLookup}>
                  Use different number
                </button>
              </div>

              {missingFields.length > 0 && (
                <div className="missing-row">
                  <span>Needed:</span>
                  {missingFields.map((item) => (
                    <strong key={item.field}>{item.label}</strong>
                  ))}
                </div>
              )}

              <div className="field-grid">
                {!profileExists && (
                  <>
                    <div className="field">
                      <label htmlFor="first_name">First name *</label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="last_name">Last name *</label>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                )}
                <div className="field">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label htmlFor="date_of_birth">Birthdate *</label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="address_street">Street address *</label>
                  <input
                    id="address_street"
                    name="address_street"
                    type="text"
                    value={formData.address_street}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="apartment_number">Apartment / Unit</label>
                  <input
                    id="apartment_number"
                    name="apartment_number"
                    type="text"
                    value={formData.apartment_number}
                    onChange={handleChange}
                    placeholder="Unit 204"
                  />
                </div>
                <div className="field">
                  <label htmlFor="address_city">City *</label>
                  <input
                    id="address_city"
                    name="address_city"
                    type="text"
                    value={formData.address_city}
                    onChange={handleChange}
                    placeholder="Windsor"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="address_state">State / Province *</label>
                  <input
                    id="address_state"
                    name="address_state"
                    type="text"
                    value={formData.address_state}
                    onChange={handleChange}
                    placeholder="Ontario"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="mandal_name">Mandal *</label>
                  <select
                    id="mandal_name"
                    name="mandal_name"
                    value={formData.mandal_name}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select mandal</option>
                    {MANDAL_OPTIONS.map((mandal) => (
                      <option key={mandal} value={mandal}>{mandal}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="submit-row">
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : profileExists ? 'Update details' : 'Create profile'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      <style jsx>{`
        .details-page {
          min-height: 100vh;
          background: #f6f8fb;
          color: #111827;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem clamp(1rem, 4vw, 3rem);
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .brand img {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #e5e7eb;
        }

        .brand p,
        .form-heading p {
          margin: 0 0 0.15rem;
          color: #64748b;
          font-weight: 700;
          font-size: 0.86rem;
        }

        .brand h1,
        .form-heading h2 {
          margin: 0;
          letter-spacing: 0;
          color: #111827;
        }

        .brand h1 {
          font-size: clamp(1.35rem, 3vw, 2rem);
        }

        .form-heading h2 {
          font-size: 1.25rem;
        }

        .page-header > span {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.45rem 0.7rem;
          background: #f8fafc;
          color: #334155;
          font-weight: 750;
          white-space: nowrap;
        }

        .panel {
          width: min(760px, calc(100% - 2rem));
          margin: 1.25rem auto 3rem;
        }

        .lookup-form,
        .details-form,
        .notice {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
        }

        .lookup-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 1rem;
          padding: 1rem;
          align-items: end;
        }

        label {
          display: block;
          margin-bottom: 0.45rem;
          color: #374151;
          font-weight: 750;
          font-size: 0.92rem;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.74rem 0.8rem;
          background: #ffffff;
          color: #111827;
          font-size: 0.96rem;
        }

        textarea {
          min-height: 110px;
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }

        button {
          border: 0;
          border-radius: 8px;
          background: #111827;
          color: #ffffff;
          font-weight: 800;
          padding: 0.78rem 1rem;
          min-height: 45px;
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .notice,
        .details-form {
          margin-top: 1rem;
        }

        .notice {
          padding: 0.9rem 1rem;
          font-weight: 750;
        }

        .notice.success {
          color: #14532d;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .notice.error {
          color: #991b1b;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .details-form {
          padding: 1rem;
        }

        .form-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .text-button {
          background: transparent;
          color: #2563eb;
          padding: 0.3rem;
          min-height: 0;
        }

        .missing-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 1rem;
          color: #475569;
        }

        .missing-row strong {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 0.35rem 0.55rem;
          font-size: 0.85rem;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .field.wide {
          grid-column: 1 / -1;
        }

        .submit-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .submit-row button {
          min-width: 160px;
        }

        @media (max-width: 680px) {
          .page-header {
            align-items: flex-start;
          }

          .page-header > span {
            display: none;
          }

          .lookup-form,
          .field-grid {
            grid-template-columns: 1fr;
          }

          .form-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .submit-row {
            justify-content: stretch;
          }

          .submit-row button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
