export interface AdSlotConfig {
  location: string;
  type: 'native-card' | 'banner';
  enabled: boolean;
  desktop: { index?: number };
  mobile: { index?: number };
}

export const adSlots: AdSlotConfig[] = [
  {
    location: 'post-grid-1',
    type: 'native-card',
    enabled: true,
    desktop: { index: 1 },
    mobile: { index: 0 },
  },
  {
    location: 'post-grid-2',
    type: 'native-card',
    enabled: true,
    desktop: { index: 3 },
    mobile: {},
  },
  {
    location: 'post-grid-bottom',
    type: 'banner',
    enabled: true,
    desktop: {},
    mobile: {},
  },
];
