export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  /** Optional small print under the section, e.g. "served with fries". */
  note?: string | null;
  /**
   * Which course this section sits under on the full menu page, e.g.
   * "From the Grill". Null means the website decides — see MENU_GROUPS
   * in lib/menu-data.ts.
   */
  menu_group?: string | null;
  sort_order: number;
  is_active: boolean;
};

export type MenuItem = {
  id: string;
  category_id: string;
  /** Item number from the printed menu, e.g. "500" */
  code: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tag: string | null;
  sort_order: number;
  is_available: boolean;
};

export type GalleryImage = {
  id: string;
  image_url: string;
  caption: string | null;
  size: 'normal' | 'wide' | 'big';
  sort_order: number;
  is_active: boolean;
};

export type Booking = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  booking_date: string;
  booking_time: string;
  guests: string;
  notes: string | null;
  status: 'new' | 'confirmed' | 'cancelled' | 'done';
  cancel_token: string;
  cancelled_at: string | null;
  created_at: string;
};

export type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  unsubscribe_token: string;
  source: string;
  created_at: string;
  unsubscribed_at: string | null;
};

export type Campaign = {
  id: string;
  subject: string;
  preheader: string | null;
  heading: string | null;
  body: string | null;
  /** The poster image — the main content of a promotion email. */
  poster_url: string | null;
  /** Legacy column, kept so old rows still load. Use poster_url. */
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  status: 'draft' | 'sent';
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  quote: string;
  author: string;
  rating: number;
  is_active: boolean;
  sort_order: number;
  /** 'google' when pulled from the Places API, 'manual' when typed in. */
  source?: string;
  status?: 'pending' | 'approved' | 'hidden';
  google_id?: string | null;
  author_photo?: string | null;
  /** Google's own wording, e.g. "3 weeks ago". */
  relative_time?: string | null;
  review_url?: string | null;
  reviewed_at?: string | null;
  fetched_at?: string | null;
};

export type SiteSetting = {
  key: string;
  value: string | null;
  label: string | null;
};

export type Settings = Record<string, string>;

/** Categories with their items attached — what the menu section renders. */
export type MenuData = (MenuCategory & { items: MenuItem[] })[];
