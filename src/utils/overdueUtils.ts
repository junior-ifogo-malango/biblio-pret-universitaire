import { MessageLevel, TypeNotification } from '../types';

/**
 * Règle métier stricte de coloration des pastilles de retard :
 * Le rouge sert UNIQUEMENT aux retards, partout dans l'application.
 * - Retard de 1 à 4 jours : pastille rouge clair (fond rose pâle, texte rouge).
 * - Retard de 5 à 6 jours : pastille rouge vif.
 * - Retard de 7 jours et plus (« à contacter ») : pastille rouge foncé.
 * - Chaque pastille affiche « J+N ».
 * La couleur est calculée dynamiquement à partir de la date active du jour, jamais stockée.
 */

export interface OverdueBadgeInfo {
  className: string;
  label: string;
}

export const MESSAGE_LEVEL_ORDER: MessageLevel[] = [
  'J+1',
  'J+2',
  'J+3-4',
  'J+5',
  'J+6',
  'J+7+'
];

export function getOverdueBadgeInfo(daysLate: number, isToContact?: boolean): OverdueBadgeInfo {
  const safeDays = Math.max(1, daysLate);
  const label = `J+${safeDays}`;

  if (safeDays >= 7 || isToContact) {
    return {
      className: 'bg-red-950 text-red-100 border border-red-900 font-bold',
      label
    };
  }

  if (safeDays >= 5) {
    return {
      className: 'bg-red-600 text-white font-bold',
      label
    };
  }

  return {
    className: 'bg-red-50 text-red-700 border border-red-200 font-semibold',
    label
  };
}

export function getMessageLevelForDaysLate(daysLate: number): MessageLevel {
  if (daysLate <= 1) return 'J+1';
  if (daysLate === 2) return 'J+2';
  if (daysLate <= 4) return 'J+3-4';
  if (daysLate === 5) return 'J+5';
  if (daysLate === 6) return 'J+6';
  return 'J+7+';
}

export function getMessageLevelLabel(level: MessageLevel): string {
  switch (level) {
    case 'J+1':
      return 'J+1';
    case 'J+2':
      return 'J+2';
    case 'J+3-4':
      return 'J+3 à J+4';
    case 'J+5':
      return 'J+5';
    case 'J+6':
      return 'J+6';
    case 'J+7+':
      return 'J+7 et plus';
  }
}

export function getNotificationTypeForLevel(level: MessageLevel): TypeNotification {
  switch (level) {
    case 'J+1':
      return 'MESSAGE_J1';
    case 'J+2':
      return 'MESSAGE_J2';
    case 'J+3-4':
      return 'MESSAGE_J3_4';
    case 'J+5':
      return 'MESSAGE_J5';
    case 'J+6':
      return 'MESSAGE_J6';
    case 'J+7+':
      return 'MESSAGE_J7_PLUS';
  }
}

export function buildGroupOverdueMessage(level: MessageLevel): {
  level: MessageLevel;
  label: string;
  subject: string;
  body: string;
} {
  const label = getMessageLevelLabel(level);

  switch (level) {
    case 'J+1':
      return {
        level,
        label,
        subject: `Retour d'un ouvrage – petit rappel`,
        body: `Bonjour,\n\nl'ouvrage que vous avez emprunté à la bibliothèque universitaire devait être rendu hier. Il s'agit peut-être d'un simple oubli : merci de le rapporter lors de votre prochaine visite. Si vous l'avez déjà rendu, ignorez ce message.\n\nCordialement,\nLa bibliothèque universitaire.`
      };
    case 'J+2':
      return {
        level,
        label,
        subject: `Rappel – retour d'un ouvrage de la bibliothèque`,
        body: `Bonjour,\n\nsauf erreur de notre part, l'ouvrage que vous avez emprunté devait être rendu il y a deux jours. Si vous l'avez encore, merci de le rapporter à la bibliothèque dès que possible. Si vous l'avez déjà rendu, ignorez ce message.\n\nCordialement,\nLa bibliothèque universitaire.`
      };
    case 'J+3-4':
      return {
        level,
        label,
        subject: `Ouvrage en retard`,
        body: `Bonjour,\n\nl'ouvrage que vous avez emprunté n'a toujours pas été rendu. Tant qu'il n'est pas restitué, vous ne pouvez pas emprunter d'autres ouvrages. Merci de le rapporter rapidement.\n\nLa bibliothèque universitaire.`
      };
    case 'J+5':
      return {
        level,
        label,
        subject: `Retard de restitution`,
        body: `Bonjour,\n\nmalgré nos précédents messages, l'ouvrage que vous avez emprunté n'a pas été restitué. Vos emprunts restent bloqués. Nous vous demandons de le rapporter dans les plus brefs délais.\n\nLa bibliothèque universitaire.`
      };
    case 'J+6':
      return {
        level,
        label,
        subject: `Dernier rappel – action requise`,
        body: `Bonjour,\n\nl'ouvrage que vous avez emprunté n'a toujours pas été restitué. Sans restitution rapide, le gestionnaire vous contactera directement.\n\nLa bibliothèque universitaire.`
      };
    case 'J+7+':
      return {
        level,
        label,
        subject: `Retard important – action requise`,
        body: `Bonjour,\n\nl'ouvrage que vous avez emprunté est en retard de plus d'une semaine. Vous ne pouvez plus emprunter tant qu'il n'est pas rendu. Merci de le rapporter immédiatement à la bibliothèque, faute de quoi le gestionnaire vous contactera directement.\n\nLa bibliothèque universitaire.`
      };
  }
}

export function buildBccMailtoHref(emails: string[], subject: string, body: string): string {
  const uniqueEmails = Array.from(
    new Set(emails.map(e => e.trim()).filter(Boolean))
  );
  const bccParam = uniqueEmails.map(e => encodeURIComponent(e)).join(',');
  const normalizedBody = body.replace(/\r?\n/g, '\r\n');
  return `mailto:?bcc=${bccParam}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(normalizedBody)}`;
}

export function buildBccMailtoBatches(
  emails: string[],
  subject: string,
  body: string
): Array<{ href: string; emails: string[] }> {
  const uniqueEmails = Array.from(
    new Set(emails.map(e => e.trim()).filter(Boolean))
  );
  if (uniqueEmails.length === 0) return [];

  const fullHref = buildBccMailtoHref(uniqueEmails, subject, body);
  if (fullHref.length <= 1800) {
    return [{ href: fullHref, emails: uniqueEmails }];
  }

  const batches: Array<{ href: string; emails: string[] }> = [];
  for (let i = 0; i < uniqueEmails.length; i += 20) {
    const chunk = uniqueEmails.slice(i, i + 20);
    batches.push({
      href: buildBccMailtoHref(chunk, subject, body),
      emails: chunk
    });
  }
  return batches;
}

export function formatShortDayMonth(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatShortLoanNumber(loanNumber?: string): string {
  if (!loanNumber) return '—';
  const parts = loanNumber.trim().split('-');
  const lastPart = parts[parts.length - 1];
  const parsed = parseInt(lastPart, 10);
  if (!isNaN(parsed)) {
    return `P-${parsed}`;
  }
  return loanNumber;
}
