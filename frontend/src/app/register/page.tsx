'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import { CREATOR_CATEGORIES } from '@ugcnp/shared';
import { AuthShell, Form } from '@/components/auth-shell';
import { Button, Input, TextArea } from '@/components/ui';
import { apiRequest } from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CREATOR_CATEGORIES.map((c) => [c, c.charAt(0) + c.slice(1).toLowerCase()]),
);

const ROLE_CARDS = [
  { value: 'creator', title: 'I am a creator', desc: 'Discover campaigns, pitch, deliver & earn' },
  { value: 'brand', title: 'I am a brand', desc: 'Post campaigns, hire creators, grow reach' },
];

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram handle' },
  { key: 'tiktok', label: 'TikTok handle' },
  { key: 'youtube', label: 'YouTube channel' },
  { key: 'facebook', label: 'Facebook page' },
] as const;

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
        done ? 'bg-primary text-white' : active ? 'ring-2 ring-primary' : 'bg-neutral-200 text-neutral-500'
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : active ? '2' : ''}
    </span>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<string>('creator');

  useEffect(() => {
    const roleParam = new URLSearchParams(window.location.search).get('role');
    if (roleParam === 'brand') setRole('brand');
  }, []);

  const [account, setAccount] = useState({ name: '', username: '', email: '', phone: '', password: '', confirm: '' });
  const [brand, setBrand] = useState({ companyName: '', industry: '', website: '', description: '', address: '' });
  const [creator, setCreator] = useState({
    category: '',
    city: '',
    bio: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    facebook: '',
    followersEstimate: '',
    engagementRate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setK<K extends keyof typeof account>(k: K, v: string) {
    setAccount((f) => ({ ...f, [k]: v }));
  }
  function setBrandField<K extends keyof typeof brand>(k: K, v: string) {
    setBrand((f) => ({ ...f, [k]: v }));
  }
  function setCreatorField<K extends keyof typeof creator>(k: K, v: string) {
    setCreator((f) => ({ ...f, [k]: v }));
  }

  function validateAccount(): string | null {
    if (account.username && !/^[a-zA-Z0-9_]{3,40}$/.test(account.username)) {
      return 'Username must be 3â€“40 characters using letters, numbers or underscores.';
    }
    if (account.password.length < 8) return 'Password must be at least 8 characters.';
    if (account.password !== account.confirm) return 'Passwords do not match.';
    return null;
  }

  function nextStep() {
    setError(null);
    const problem = validateAccount();
    if (problem) {
      setError(problem);
      return;
    }
    setStep(2);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) {
      nextStep();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const profile =
        role === 'brand'
          ? {
              companyName: brand.companyName,
              industry: brand.industry,
              website: brand.website,
              description: brand.description,
              address: brand.address,
            }
          : {
              username: account.username,
              category: creator.category || undefined,
              city: creator.city,
              bio: creator.bio,
              instagram: creator.instagram,
              tiktok: creator.tiktok,
              youtube: creator.youtube,
              facebook: creator.facebook,
              followersEstimate: creator.followersEstimate ? Number(creator.followersEstimate) : undefined,
              engagementRate: creator.engagementRate ? Number(creator.engagementRate) : undefined,
            };
      await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: account.name,
          email: account.email,
          password: account.password,
          phone: account.phone || undefined,
          role: role === 'brand' ? 'BRAND' : 'CREATOR',
          username: role === 'creator' ? account.username || undefined : undefined,
          profile,
        },
      });
      router.push(`/verify?email=${encodeURIComponent(account.email)}&purpose=REGISTER`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Join the network"
      subtitle="A two-step signup â€” your profile details help brands and creators find the right match."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <Form onSubmit={onSubmit}>
        <div className="mb-6 flex items-center gap-3">
          <StepDot active={step === 1} done={step === 2} />
          <span className={`text-sm ${step === 1 ? 'font-semibold text-neutral-900' : 'text-neutral-400'}`}>Account</span>
          <span className="h-px flex-1 bg-neutral-200" />
          <StepDot active={step === 2} done={false} />
          <span className={`text-sm ${step === 2 ? 'font-semibold text-neutral-900' : 'text-neutral-400'}`}>
            {role === 'brand' ? 'Company' : 'Creator profile'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-3">
              <Input label="Full name" required value={account.name} onChange={(e) => setK('name', e.target.value)} placeholder="Sita Gurung" />
              {role === 'creator' && (
                <Input
                  label="Username"
                  required
                  value={account.username}
                  onChange={(e) => setK('username', e.target.value)}
                  placeholder="@sitacreates"
                  error={account.username && !/^[a-zA-Z0-9_]+$/.test(account.username) ? 'Only letters, numbers and underscores' : undefined}
                />
              )}
              <Input label="Email" type="email" required value={account.email} onChange={(e) => setK('email', e.target.value)} placeholder="you@example.com" />
              <Input label="Phone" type="tel" value={account.phone} onChange={(e) => setK('phone', e.target.value)} placeholder="+977 9XXXXXXXX" />
              <Input label="Password" type="password" required value={account.password} onChange={(e) => setK('password', e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
              <Input label="Confirm password" type="password" required value={account.confirm} onChange={(e) => setK('confirm', e.target.value)} autoComplete="new-password" placeholder="Repeat your password" />

              <div className="block">
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">I am signing up asâ€¦</span>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_CARDS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`rounded-xl border px-3 py-3 text-left transition-all duration-150 ${
                        role === r.value
                          ? 'border-primary bg-primary-soft ring-2 ring-primary/20'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-neutral-800">{r.title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : role === 'brand' ? (
            <motion.div key="step2brand" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-3">
              <Input label="Company name" required value={brand.companyName} onChange={(e) => setBrandField('companyName', e.target.value)} placeholder="Himalayan Teas Pvt. Ltd." />
              <Input label="Industry" value={brand.industry} onChange={(e) => setBrandField('industry', e.target.value)} placeholder="e.g. FMCG, Tourism, Fashion" />
              <Input label="Website" type="url" value={brand.website} onChange={(e) => setBrandField('website', e.target.value)} placeholder="https://example.com" />
              <TextArea label="About your brand" value={brand.description} onChange={(e) => setBrandField('description', e.target.value)} rows={3} placeholder="What does your brand do?" />
              <Input label="Address" value={brand.address} onChange={(e) => setBrandField('address', e.target.value)} placeholder="Kathmandu, Nepal" />
            </motion.div>
          ) : (
            <motion.div key="step2creator" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-600">Primary category</span>
                <select
                  value={creator.category}
                  onChange={(e) => setCreatorField('category', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary-soft"
                >
                  <option value="">Select a category</option>
                  {CREATOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="City" value={creator.city} onChange={(e) => setCreatorField('city', e.target.value)} placeholder="Kathmandu" />
              <TextArea label="Bio" value={creator.bio} onChange={(e) => setCreatorField('bio', e.target.value)} rows={3} placeholder="A short intro about you and your content" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Followers (est.)" type="number" min="0" value={creator.followersEstimate} onChange={(e) => setCreatorField('followersEstimate', e.target.value)} placeholder="50000" />
                <Input label="Engagement (%)" type="number" min="0" max="100" step="0.1" value={creator.engagementRate} onChange={(e) => setCreatorField('engagementRate', e.target.value)} placeholder="4.5" />
              </div>
              {SOCIAL_FIELDS.map((s) => (
                <Input key={s.key} label={s.label} value={creator[s.key]} onChange={(e) => setCreatorField(s.key, e.target.value)} placeholder="@handle" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          {step === 2 && (
            <Button variant="outline" type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Creatingâ€¦
              </>
            ) : step === 1 ? (
              <>
                Continue <ArrowRight className="ml-1.5 inline h-4 w-4" />
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </div>
        <p className="text-center text-xs text-neutral-400">
          We&apos;ll email you a verification code to confirm your account.
        </p>
      </Form>
    </AuthShell>
  );
}
