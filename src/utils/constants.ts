import { Flavor, GranizadoSizeConfig, InventoryItem, Topping } from '../types';

export const SIZE_CONFIGS: Record<string, GranizadoSizeConfig> = {
  '12oz': {
    id: '12oz',
    name: 'Granizado 12 Onzas (Pequeño)',
    ounces: 12,
    price: 12000,
    costEstimate: 3200,
    iceGrams: 300,
    syrupMl: 60,
    cupStockKey: 'vaso-12oz',
    lidStockKey: 'tapa-12oz',
  },
  '14oz': {
    id: '14oz',
    name: 'Granizado 14 Onzas (Mediano)',
    ounces: 14,
    price: 14000,
    costEstimate: 3900,
    iceGrams: 380,
    syrupMl: 75,
    cupStockKey: 'vaso-14oz',
    lidStockKey: 'tapa-14oz',
  },
  '16oz': {
    id: '16oz',
    name: 'Granizado 16 Onzas (Grande)',
    ounces: 16,
    price: 16000,
    costEstimate: 4600,
    iceGrams: 450,
    syrupMl: 90,
    cupStockKey: 'vaso-16oz',
    lidStockKey: 'tapa-16oz',
  },
};

export const FLAVORS: Flavor[] = [
  {
    id: 'mora-azul',
    name: 'Mora Azul Neón',
    color: '#00F2FE',
    glowColor: 'rgba(0, 242, 254, 0.6)',
    description: 'Sabor intenso a mora silvestre escarchada con toque azul eléctrico',
  },
  {
    id: 'fresa-ice',
    name: 'Fresa Salvaje Ice',
    color: '#FF007F',
    glowColor: 'rgba(255, 0, 127, 0.6)',
    description: 'Doble fresa natural dulce con frescura polar',
  },
  {
    id: 'limon-electrico',
    name: 'Limón Eléctrico',
    color: '#39FF14',
    glowColor: 'rgba(57, 255, 20, 0.6)',
    description: 'Cítrico ultra refrescante y chispeante',
  },
  {
    id: 'mango-biche',
    name: 'Mango Biche Ácido',
    color: '#FFE600',
    glowColor: 'rgba(255, 230, 0, 0.6)',
    description: 'Puro mango biche verde colombiano con toque ácido',
  },
  {
    id: 'maracuya-neon',
    name: 'Maracuyá Neón',
    color: '#FF8800',
    glowColor: 'rgba(255, 136, 0, 0.6)',
    description: 'Fruta de la pasión tropical súper concentrada',
  },
  {
    id: 'cereza-polar',
    name: 'Cereza Glacial',
    color: '#E11D48',
    glowColor: 'rgba(225, 29, 72, 0.6)',
    description: 'Sabor a cereza roja dulce con efecto ultra frío',
  },
  {
    id: 'uva-violeta',
    name: 'Uva Escarchada',
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    description: 'Uva morada dulce tipo frappé cristalino',
  },
  {
    id: 'tamarindo-chamoy',
    name: 'Tamarindo Fuego & Ice',
    color: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    description: 'Tamarindo dulce picantico agridulce',
  },
];

export const TOPPINGS: Topping[] = [
  {
    id: 'leche-condensada',
    name: 'Leche Condensada',
    price: 1500,
    stockKey: 'insumo-leche-condensada',
    portionUsed: 30, // 30 ml
    unit: 'ml',
  },
  {
    id: 'gomitas-acidas',
    name: 'Gomitas Ácidas Neón',
    price: 1500,
    stockKey: 'insumo-gomitas',
    portionUsed: 35, // 35 grams
    unit: 'g',
  },
  {
    id: 'chamoy-tajin',
    name: 'Chamoy + Escarchado Tajín',
    price: 1000,
    stockKey: 'insumo-chamoy',
    portionUsed: 25, // 25 ml
    unit: 'ml',
  },
  {
    id: 'chocolate-liquido',
    name: 'Sirope de Chocolate',
    price: 1500,
    stockKey: 'insumo-chocolate',
    portionUsed: 25,
    unit: 'ml',
  },
  {
    id: 'cereza-topping',
    name: 'Cereza Marrasquino (2 uds)',
    price: 1000,
    stockKey: 'insumo-cerezas',
    portionUsed: 2,
    unit: 'uds',
  },
];

// Insumos iniciales vacíos como solicitó el usuario: todos los insumos se agregan desde el panel de administrador
export const INITIAL_INVENTORY: InventoryItem[] = [];

// Paleta de colores neón para nuevos sabores
export const NEON_COLOR_PALETTE = [
  { name: 'Azul Eléctrico', hex: '#00F2FE', glow: 'rgba(0, 242, 254, 0.6)' },
  { name: 'Fresa Neón', hex: '#FF007F', glow: 'rgba(255, 0, 127, 0.6)' },
  { name: 'Limón Neón', hex: '#39FF14', glow: 'rgba(57, 255, 20, 0.6)' },
  { name: 'Amarillo Mango', hex: '#FFE600', glow: 'rgba(255, 230, 0, 0.6)' },
  { name: 'Naranja Fuego', hex: '#FF8800', glow: 'rgba(255, 136, 0, 0.6)' },
  { name: 'Púrpura Neón', hex: '#A855F7', glow: 'rgba(168, 85, 247, 0.6)' },
  { name: 'Cereza Glacial', hex: '#E11D48', glow: 'rgba(225, 29, 72, 0.6)' },
  { name: 'Cian Polar', hex: '#06B6D4', glow: 'rgba(6, 182, 212, 0.6)' },
  { name: 'Verde Menta', hex: '#10B981', glow: 'rgba(16, 185, 129, 0.6)' },
];

// Plantilla sugerida para que el administrador pueda cargar insumos con un solo clic si lo desea
export const SUGGESTED_INVENTORY_TEMPLATES: InventoryItem[] = [
  {
    id: 'vaso-12oz',
    name: 'Vaso 12 Onzas (Pequeño)',
    category: 'vasos',
    sizeId: '12oz',
    stock: 100,
    minStock: 25,
    unit: 'uds',
    costPerUnit: 600,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'vaso-14oz',
    name: 'Vaso 14 Onzas (Mediano)',
    category: 'vasos',
    sizeId: '14oz',
    stock: 100,
    minStock: 20,
    unit: 'uds',
    costPerUnit: 750,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'vaso-16oz',
    name: 'Vaso 16 Onzas (Grande)',
    category: 'vasos',
    sizeId: '16oz',
    stock: 80,
    minStock: 20,
    unit: 'uds',
    costPerUnit: 900,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'sabor-mora-azul',
    name: 'Mora Azul Neón',
    category: 'pulpas',
    color: '#00F2FE',
    glowColor: 'rgba(0, 242, 254, 0.6)',
    description: 'Sabor intenso a mora silvestre escarchada',
    stock: 3000,
    minStock: 600,
    unit: 'ml',
    costPerUnit: 18,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'sabor-fresa-ice',
    name: 'Fresa Salvaje Ice',
    category: 'pulpas',
    color: '#FF007F',
    glowColor: 'rgba(255, 0, 127, 0.6)',
    description: 'Doble fresa natural dulce',
    stock: 3500,
    minStock: 600,
    unit: 'ml',
    costPerUnit: 20,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'sabor-limon-electrico',
    name: 'Limón Eléctrico',
    category: 'pulpas',
    color: '#39FF14',
    glowColor: 'rgba(57, 255, 20, 0.6)',
    description: 'Cítrico ultra refrescante',
    stock: 2500,
    minStock: 500,
    unit: 'ml',
    costPerUnit: 16,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'topic-lechera',
    name: 'Lechera / Leche Condensada',
    category: 'toppings',
    price: 1500,
    portionUsed: 30,
    stock: 1200,
    minStock: 300,
    unit: 'ml',
    costPerUnit: 16,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'topic-gomitas',
    name: 'Gomitas Ácidas Neón',
    category: 'toppings',
    price: 1500,
    portionUsed: 35,
    stock: 1500,
    minStock: 300,
    unit: 'g',
    costPerUnit: 18,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'topic-chamoy',
    name: 'Chamoy + Tajín',
    category: 'toppings',
    price: 1000,
    portionUsed: 25,
    stock: 1000,
    minStock: 250,
    unit: 'ml',
    costPerUnit: 14,
    lastRestocked: new Date().toISOString().slice(0, 10),
  },
];

export const DEFAULT_AUTH = {
  isAuthenticated: false,
  currentRole: 'empleado' as const,
  employeeUser: 'empleado',
  adminUser: 'administrador',
  employeePin: '1234', // del uno al cuatro
  adminPin: '4321',    // del cuatro al uno
  employeeName: 'Cajero Turno Principal',
  adminName: 'Administrador General',
};

export const INITIAL_TABLES: Array<{ id: string; name: string; cart: any[]; customerName?: string }> = [
  { id: 'mesa-1', name: 'Mesa 1', cart: [] },
  { id: 'mesa-2', name: 'Mesa 2', cart: [] },
  { id: 'mesa-3', name: 'Mesa 3', cart: [] },
  { id: 'mesa-4', name: 'Mesa 4', cart: [] },
  { id: 'mesa-5', name: 'Mesa 5', cart: [] },
  { id: 'para-llevar', name: 'Para Llevar / Mostrador', cart: [] },
];
