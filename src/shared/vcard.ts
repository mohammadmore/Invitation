import { contactLinks, normalizePhone, type InvitationConfig, type Lang, localize } from './invitation';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** vCard 3.0 for the organiser, so guests can save the company in their phone's contacts. */
export function vcardContent(c: InvitationConfig, lang: Lang = 'fa'): string {
  const l = localize(c, lang);
  const links = contactLinks(c.contact);
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${esc(l.company.name || c.company.name)}`, `ORG:${esc(l.company.name || c.company.name)}`];
  const phone = normalizePhone(c.contact.phone);
  if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${c.contact.phone.trim().startsWith('+') || phone.startsWith('98') ? '+' : ''}${phone}`);
  const wa = normalizePhone(c.contact.whatsapp, true);
  if (wa && wa !== phone) lines.push(`TEL;TYPE=CELL:+${wa}`);
  for (const link of links) {
    if (link.kind === 'email') lines.push(`EMAIL;TYPE=WORK:${link.href.replace('mailto:', '')}`);
    else if (link.kind !== 'phone' && link.kind !== 'whatsapp') lines.push(`URL:${link.href}`);
  }
  if (l.company.tagline) lines.push(`NOTE:${esc(l.company.tagline)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

/** vCard of a sales rep (the company as organisation), saved from the rep's invitation link. */
export function repVcardContent(c: InvitationConfig, rep: { name: string; title: string; phone: string; whatsapp: string; email: string }, lang: Lang = 'fa'): string {
  const l = localize(c, lang);
  const company = l.company.name || c.company.name;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${esc(rep.name || company)}`, `ORG:${esc(company)}`];
  if (rep.title) lines.push(`TITLE:${esc(rep.title)}`);
  const phone = normalizePhone(rep.phone || c.contact.phone);
  if (phone) lines.push(`TEL;TYPE=CELL,VOICE:${phone.startsWith('98') ? '+' : ''}${phone}`);
  const wa = normalizePhone(rep.whatsapp, true);
  if (wa && wa !== phone) lines.push(`TEL;TYPE=CELL:+${wa}`);
  const email = rep.email || c.contact.email;
  if (email) lines.push(`EMAIL;TYPE=WORK:${email}`);
  for (const link of contactLinks(c.contact)) if (link.kind === 'website' || link.kind === 'instagram') lines.push(`URL:${link.href}`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}
