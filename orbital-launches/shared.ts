// The data structures
export const countries = {
  'SU': {
    label: 'Soviet Union / Russia',
    color: '#D50000'
  },
  'US': {
    label: 'United States',
    color: '#0277BD'
  },
  'RU': {
    label: 'Soviet Union / Russia',
    color: '#D50000'
  },
  'F': {
    label: 'France',
    color: '#1A237E'
  },
  'J': {
    label: 'Japan',
    color: '#F06292'
  },
  'I': {
    label: 'Italy',
    color: '#1B5E20'
  },
  'I-ELDO': {
    label: 'European Union',
    color: '#006064'
  },
  'CN': {
    label: 'China',
    color: '#FDD835'
  },
  'UK': {
    label: 'United Kingdom',
    color: '#D500F9'
  },
  'IN': {
    label: 'India',
    color: '#BF360C'
  },
  'I-ESA': {
    label: 'European Union',
    color: '#006064'
  },
  'IL': {
    label: 'Israel',
    color: '#424242'
  },
  'BR': {
    label: 'Brazil',
    color: '#AEEA00'
  },
  'KP': {
    label: 'North Korea',
    color: '#FF1744'
  },
  'CYM': {
    label: 'Canada',
    color: '#4E342E'
  },
  'IR': {
    label: 'Iran',
    color: '#FF6F00'
  },
  'KR': {
    label: 'South Korea',
    color: '#00BFA5'
  },
  'NZ': {
    label: 'New Zealand',
    color: '#6200EA'
  }
} as const;

export interface Launch {
  date: string;
  id: string;
  country: string;
  site: string;
  rocket: string;
  payload: string;
};
