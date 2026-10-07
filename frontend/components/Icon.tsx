declare module "lucide-react" {
  export type LucideIcon = any;
  export const AlertTriangle: any;
  export const ArrowLeftRight: any;
  export const ArrowRight: any;
  export const ArrowUpRight: any;
  export const AtSign: any;
  export const Ban: any;
  export const BarChart3: any;
  export const Barcode: any;
  export const Bell: any;
  export const Bot: any;
  export const Building2: any;
  export const Calendar: any;
  export const CalendarX: any;
  export const Check: any;
  export const CheckCircle2: any;
  export const ChevronDown: any;
  export const ChevronLeft: any;
  export const ChevronRight: any;
  export const CircleAlert: any;
  export const CircleMinus: any;
  export const CirclePlus: any;
  export const ClipboardClock: any;
  export const ClipboardList: any;
  export const Clock: any;
  export const DollarSign: any;
  export const EllipsisVertical: any;
  export const Eye: any;
  export const EyeOff: any;
  export const ExternalLink: any;
  export const FileText: any;
  export const HelpCircle: any;
  export const History: any;
  export const IdCard: any;
  export const Info: any;
  export const KeyRound: any;
  export const LayoutDashboard: any;
  export const Lock: any;
  export const LogOut: any;
  export const Mail: any;
  export const MailCheck: any;
  export const MapPin: any;
  export const Package: any;
  export const Pencil: any;
  export const Pill: any;
  export const Plus: any;
  export const Receipt: any;
  export const ScanLine: any;
  export const Search: any;
  export const Settings: any;
  export const Shield: any;
  export const ShieldCheck: any;
  export const ShoppingCart: any;
  export const SlidersHorizontal: any;
  export const Smartphone: any;
  export const Star: any;
  export const Stethoscope: any;
  export const Thermometer: any;
  export const Trash2: any;
  export const TrendingDown: any;
  export const TrendingUp: any;
  export const Truck: any;
  export const Upload: any;
  export const User: any;
  export const UserCog: any;
  export const UserPlus: any;
  export const UserX: any;
  export const Users: any;
  export const X: any;
}

import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Ban,
  BarChart3,
  Barcode,
  Bell,
  Bot,
  Building2,
  Calendar,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleMinus,
  CirclePlus,
  ClipboardClock,
  ClipboardList,
  Clock,
  DollarSign,
  EllipsisVertical,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  HelpCircle,
  History,
  IdCard,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  MapPin,
  Package,
  Pencil,
  Pill,
  Plus,
  Receipt,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Star,
  Stethoscope,
  Thermometer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCog,
  UserPlus,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

// Single source of truth for the app's icon names.
// This keeps icon usage consistent and avoids repeated string literals across the UI.
const ICONS: Record<string, LucideIcon> = {
  // Navigation and shell
  dashboard: LayoutDashboard,
  help: HelpCircle,
  logout: LogOut,
  search: Search,
  expand_more: ChevronDown,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  filter_list: SlidersHorizontal,
  more_vert: EllipsisVertical,
  open_in_new: ExternalLink,
  arrow_forward: ArrowRight,
  arrow_outward: ArrowUpRight,
  swap_horiz: ArrowLeftRight,
  settings: Settings,

  // Business and healthcare data
  medication: Pill,
  inventory_2: Package,
  warning: AlertTriangle,
  event_busy: CalendarX,
  block: Ban,
  payments: DollarSign,
  history: History,
  local_shipping: Truck,
  check_circle: CheckCircle2,
  verified_user: ShieldCheck,
  alternate_email: AtSign,
  key: KeyRound,
  smartphone: Smartphone,
  upload: Upload,
  add: Plus,
  badge: IdCard,
  domain: Building2,
  medical_services: Stethoscope,
  mail: Mail,
  lock: Lock,
  mark_email_read: MailCheck,
  lock_reset: KeyRound,
  person: User,
  shopping_cart: ShoppingCart,
  bar_chart: BarChart3,
  group: Users,
  receipt_long: Receipt,
  notifications: Bell,
  star: Star,
  close: X,
  check: Check,
  add_circle: CirclePlus,
  remove_circle: CircleMinus,
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  person_add: UserPlus,
  edit: Pencil,
  shield: Shield,
  manage_accounts: UserCog,
  person_off: UserX,
  calendar_month: Calendar,
  error: CircleAlert,
  place: MapPin,
  thermostat: Thermometer,
  barcode: Barcode,
  scan: ScanLine,
  clinical_notes: ClipboardList,
  assignment_clock: ClipboardClock,
  info: Info,
  schedule: Clock,
  bot: Bot,
  description: FileText,
  delete: Trash2,
  visibility: Eye,
  visibility_off: EyeOff,
};

type IconProps = {
  name: string;
  size?: number;
  className?: string;
};

export default function Icon({ name, size = 19, className = "" }: IconProps) {
  const IconComponent = ICONS[name];

  if (!IconComponent) {
    console.warn(`Icon: no Lucide mapping for "${name}"`);
    return null;
  }

  return (
    <IconComponent
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      strokeWidth={2}
    />
  );
}
