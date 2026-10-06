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
