import {
  Award, Ban, Bath, BedDouble, BookOpen, Briefcase, Bug, CalendarClock, CalendarDays, ChefHat, Cherry, CircleHelp, CloudDrizzle, CloudSun, Droplets, EyeOff, Fence,
  Flame, Flower2, Hand, Heart, HeartHandshake, House, LayoutGrid, Leaf, Library, Maximize, Microscope, Monitor, Moon, NotebookPen, Package, PackageOpen, PawPrint,
  RefreshCw, Ruler, Scissors, ShoppingBag, Shovel, Shuffle, Sofa, Sparkles, Sprout, Square, Star, Stethoscope, Sun, SunMedium, Sunset, Timer, Trees,
} from 'lucide-react';

// Server data refers to icons by kebab-case name; only the ones in use are bundled.
const MAP = {
  award: Award, ban: Ban, bath: Bath, 'bed-double': BedDouble, 'book-open': BookOpen, briefcase: Briefcase, bug: Bug, 'calendar-clock': CalendarClock, 'calendar-days': CalendarDays,
  'chef-hat': ChefHat, cherry: Cherry, 'circle-help': CircleHelp, 'cloud-drizzle': CloudDrizzle, 'cloud-sun': CloudSun, droplets: Droplets, 'eye-off': EyeOff, fence: Fence,
  flame: Flame, 'flower-2': Flower2, hand: Hand, heart: Heart, 'heart-handshake': HeartHandshake, home: House, 'layout-grid': LayoutGrid, leaf: Leaf, library: Library,
  maximize: Maximize, microscope: Microscope, monitor: Monitor, moon: Moon, 'notebook-pen': NotebookPen, package: Package, 'package-open': PackageOpen, 'paw-print': PawPrint,
  'refresh-cw': RefreshCw, ruler: Ruler, scissors: Scissors, 'shopping-bag': ShoppingBag, shovel: Shovel, shuffle: Shuffle, sofa: Sofa, sparkles: Sparkles, sprout: Sprout,
  square: Square, star: Star, stethoscope: Stethoscope, sun: Sun, 'sun-medium': SunMedium, sunset: Sunset, timer: Timer, trees: Trees,
};

export default function Icon({ name, size = 20, ...rest }) {
  const C = MAP[name] || Leaf;
  return <C size={size} aria-hidden="true" {...rest} />;
}
