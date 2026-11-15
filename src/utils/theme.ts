/**
 * Palette centralisée pour l'application BiblioPrêt
 * Spécifiée par le PROMPT J
 */

export const THEME = {
  // Barre latérale gestionnaire
  sidebar: {
    bg: '#0F2742',
    bgActive: '#1E3A5F',
    bgHover: '#163152',
    text: '#FFFFFF',
    textDim: '#94A3B8',
    width: '240px',
    badgeRed: '#E24B4A',
    badgeRedBg: 'rgba(226, 75, 74, 0.2)'
  },

  // Barre du haut fine
  topbar: {
    height: '48px',
    bg: '#FFFFFF',
    border: '#E3E8EF',
    title: '#0F172A',
    dateText: '#5B6B82',
    btnReturnBorder: '#0F2742',
    btnLoanOrange: '#E8741A',
    btnLoanOrangeHover: '#D26310'
  },

  // Zone de contenu
  content: {
    bg: '#F4F7FB',
    cardBorder: '#E2E8F0'
  },

  // Cartes d'indicateurs de l'accueil
  stats: {
    loans: {
      color: '#1E3A5F',
      bg: '#EEF2F6',
      text: '#1E3A5F'
    },
    available: {
      color: '#15803D',
      bg: '#F0FDF4',
      text: '#166534'
    },
    students: {
      color: '#4F46E5',
      bg: '#EEF2FF',
      text: '#3730A3'
    },
    overdue: {
      color: '#A32D2D',
      bg: '#FEF2F2',
      text: '#991B1B',
      brightRed: '#EF4444'
    }
  },

  // Bordures supérieures de blocs d'accueil
  blocks: {
    borderReminders: '#E8741A',
    borderActivity: '#0369A1'
  }
} as const;
