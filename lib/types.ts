export type Profile = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  upi_id: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
};

export type Trip = {
  id: string;
  name: string;
  destination: string | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  trip_image_url: string | null;
  created_by: string | null;
  invite_code: string;
};

export type TripMember = {
  id: string;
  trip_id: string;
  profile_id: string | null;
  name: string;
  phone: string | null;
  upi_id: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member" | "guest";
};

export type Expense = {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: string;
  paid_by_member_id: string;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  member_id: string;
  split_amount: number;
  split_percentage: number | null;
  split_type: "equal" | "custom" | "percentage";
};

export type Settlement = {
  id: string;
  trip_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  status: "pending" | "paid_by_sender" | "confirmed_by_receiver" | "settled";
  payment_note: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
};
