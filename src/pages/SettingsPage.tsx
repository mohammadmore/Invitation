import type React from 'react';
import { useEffect, useState } from 'react';
import { CircleCheck, Home, Loader2, Lock, MessageSquareText, Save, Send, TriangleAlert } from 'lucide-react';
import { api, getAdminPassword, setAdminPassword } from '../lib/api';
import { route } from '../lib/paths';
import { hideSplash } from '../lib/splash';
import { SMS_PROVIDERS, type SmsSettings } from '../shared/notify';
import { Field, Section, TextArea, TextInput, Toggle } from '../builder/ui';

/** System settings (admin): SMS panel used for attendance notifications. Nothing is hard-coded. */
export default function SettingsPage() {
  const [sms, setSms] = useState<SmsSettings | null>(null);
  const [sentToday, setSentToday] = useState(0);
  const [state, setState] = useState<'loading' | 'locked' | 'ready'>('loading');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const load = () =>
    api
      .settings()
      .then(r => {
        setSms(r.sms);
        setSentToday(r.sentToday);
        setState('ready');
      })
      .catch(() => setState('locked'));

  useEffect(() => {
    hideSplash();
    document.title = 'تنظیمات سامانه';
    document.body.style.backgroundColor = '#f1f5f9';
    load();
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }
  if (state === 'locked') return <Login onDone={load} />;
  if (!sms) return null;

  const provider = SMS_PROVIDERS.find(p => p.id === sms.provider)!;
  const set = (patch: Partial<SmsSettings>) => setSms(s => (s ? { ...s, ...patch } : s));
  const setCustom = (patch: Partial<SmsSettings['custom']>) => setSms(s => (s ? { ...s, custom: { ...s.custom, ...patch } } : s));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api.saveSettings(sms!);
      setSms(r.sms);
      setMsg({ ok: true, text: 'تنظیمات ذخیره شد.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      await api.saveSettings(sms!);
      const r = await api.testSms(testTo, 'پیام آزمایشی سامانه دعوتنامه نمایشگاه ✔');
      setTestResult({ ok: r.ok, detail: r.detail || (r.ok ? 'ارسال شد' : `HTTP ${r.status}`) });
    } catch (e) {
      setTestResult({ ok: false, detail: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <a href={route()} className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-600" title="صفحه اصلی">
            <Home className="w-5 h-5" />
          </a>
          <h1 className="font-black">تنظیمات سامانه</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Section
          title="پنل پیامک"
          description="برای ارسال اعلان «اعلام حضور» به کارشناس‌ها و مدیران. اطلاعات فقط روی سرور ذخیره می‌شود و کلیدها هرگز کامل نمایش داده نمی‌شوند؛ برای تغییر، مقدار جدید را وارد کنید."
        >
          <Field label="سرویس‌دهنده">
            <select value={sms.provider} onChange={e => set({ provider: e.target.value as SmsSettings['provider'] })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5">
              {SMS_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          {provider.help && <p className="text-xs text-slate-500 leading-relaxed">{provider.help}</p>}

          {provider.fields.includes('apiKey') && (
            <Field label="کلید API">
              <TextInput ltr value={sms.apiKey} onChange={e => set({ apiKey: e.target.value })} placeholder="API Key" autoComplete="off" />
            </Field>
          )}
          {provider.fields.includes('username') && (
            <Field label="نام کاربری">
              <TextInput ltr value={sms.username} onChange={e => set({ username: e.target.value })} autoComplete="off" />
            </Field>
          )}
          {provider.fields.includes('password') && (
            <Field label="رمز عبور / کلید وب‌سرویس">
              <TextInput ltr type="password" value={sms.password} onChange={e => set({ password: e.target.value })} autoComplete="new-password" />
            </Field>
          )}
          {(provider.fields.includes('sender') || sms.provider === 'custom') && (
            <Field label="شماره خط فرستنده">
              <TextInput ltr value={sms.sender} onChange={e => set({ sender: e.target.value })} placeholder="3000xxxx" />
            </Field>
          )}

          {sms.provider === 'custom' && (
            <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                مستندات وب‌سرویس پنل خود را ببینید و درخواست ارسال را این‌جا شرح دهید. در آدرس و بدنه می‌توانید از <code dir="ltr">{'{to}'}</code>، <code dir="ltr">{'{message}'}</code> و <code dir="ltr">{'{sender}'}</code> استفاده کنید.
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <select value={sms.custom.method} onChange={e => setCustom({ method: e.target.value as 'GET' | 'POST' })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" dir="ltr">
                  <option>POST</option>
                  <option>GET</option>
                </select>
                <TextInput ltr value={sms.custom.url} onChange={e => setCustom({ url: e.target.value })} placeholder="https://api.panel.ir/send?to={to}&text={message}" />
              </div>
              <Field label="هدرها (هر خط: Name: value)" hint="مثلاً Authorization: Bearer … — ذخیره‌شده‌ها نمایش داده نمی‌شوند؛ برای تغییر، مقدار کامل جدید را وارد کنید.">
                <TextArea dir="ltr" className="text-left font-mono text-xs" rows={3} value={sms.custom.headers} onChange={e => setCustom({ headers: e.target.value })} />
              </Field>
              {sms.custom.method === 'POST' && (
                <>
                  <Field label="نوع بدنه">
                    <select value={sms.custom.bodyType} onChange={e => setCustom({ bodyType: e.target.value as 'json' | 'form' })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="json">JSON</option>
                      <option value="form">Form (key=value)</option>
                    </select>
                  </Field>
                  <Field label="قالب بدنه">
                    <TextArea dir="ltr" className="text-left font-mono text-xs" rows={4} value={sms.custom.body} onChange={e => setCustom({ body: e.target.value })} />
                  </Field>
                </>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="متن نشانه موفقیت در پاسخ (اختیاری)" hint="اگر خالی باشد، هر پاسخ 2xx موفق حساب می‌شود.">
                  <TextInput ltr value={sms.custom.successText} onChange={e => setCustom({ successText: e.target.value })} placeholder='"status":1' />
                </Field>
                <div className="pt-7">
                  <Toggle checked={sms.custom.perRecipient} onChange={perRecipient => setCustom({ perRecipient })} label="یک درخواست برای هر گیرنده" />
                </div>
              </div>
            </div>
          )}

          {sms.provider !== 'none' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="قالب شماره گیرندگان">
                <select value={sms.numberFormat} onChange={e => set({ numberFormat: e.target.value as 'local' | 'intl' })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">
                  <option value="local">09121234567</option>
                  <option value="intl">989121234567</option>
                </select>
              </Field>
              <Field label="سقف ارسال روزانه" hint={`امروز: ${sentToday.toLocaleString('fa-IR')} پیامک`}>
                <TextInput ltr type="number" min={1} value={sms.dailyLimit} onChange={e => set({ dailyLimit: Number(e.target.value) })} />
              </Field>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black px-5 py-2.5 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} ذخیره
            </button>
            {msg && <span className={`text-sm font-bold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</span>}
          </div>
        </Section>

        {sms.provider !== 'none' && (
          <Section title="ارسال آزمایشی" description="قبل از استفاده، با یک پیامک آزمایشی مطمئن شوید تنظیمات درست است. پاسخ پنل نمایش داده می‌شود.">
            <div className="flex flex-wrap gap-2">
              <TextInput ltr inputMode="tel" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="0912…" className="max-w-xs" />
              <button onClick={test} disabled={testing || !testTo} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-bold px-4 py-2.5 disabled:opacity-60">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} ارسال آزمایشی
              </button>
            </div>
            {testResult && (
              <div className={`rounded-2xl border p-3 text-sm flex gap-2 ${testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {testResult.ok ? <CircleCheck className="w-5 h-5 shrink-0" /> : <TriangleAlert className="w-5 h-5 shrink-0" />}
                <span className="break-all" dir="auto">
                  {testResult.ok ? 'ارسال شد. ' : 'ارسال نشد: '}
                  {testResult.detail}
                </span>
              </div>
            )}
          </Section>
        )}

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <MessageSquareText className="w-4 h-4" /> قوانین اعلان هر دعوتنامه (به چه کسی، با چه متنی) در ویزارد، مرحله «مهمانان» تنظیم می‌شود.
        </p>
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState(getAdminPassword());
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAdminPassword(password);
    const r = await api.auth().catch(() => ({ admin: false }));
    if (r.admin) return onDone();
    setAdminPassword('');
    setError('رمز نادرست است');
  }
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 w-full max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-black text-lg">تنظیمات سامانه — ورود مدیر</h1>
        <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز مدیر" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none focus:border-sky-500" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black py-3">ورود</button>
      </form>
    </div>
  );
}
