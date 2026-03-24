'use client';

import { useMemo } from 'react';
import { type ColumnDef, type FilterFn } from '@tanstack/react-table';
import { Mail, Phone, MapPin, Calendar, Users } from 'lucide-react';
import { DataTable } from '@repo/ui/components/data-table';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'active' | 'suspended' | 'inactive';
type License = 'trial' | 'active' | 'expired' | 'cancelled';

type Tenant = {
  id: string;
  name: string;
  owner: string;
  status: Status;
  license: License;
  city: string;
  email: string;
  phone: string;
  createdAt: string;
  platform: string;
  monthlyOrders: number;
};

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
  active: 'Aktif',
  suspended: 'Askıda',
  inactive: 'Pasif',
};
const STATUS_CLASS: Record<Status, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-rose-100 text-rose-700',
  inactive: 'bg-slate-100 text-slate-500',
};
const LICENSE_LABEL: Record<License, string> = {
  trial: 'Deneme',
  active: 'Aktif',
  expired: 'Süresi Doldu',
  cancelled: 'İptal',
};
const LICENSE_CLASS: Record<License, string> = {
  trial: 'border-sky-300 text-sky-600',
  active: 'border-emerald-300 text-emerald-600',
  expired: 'border-rose-300 text-rose-500',
  cancelled: 'border-slate-300 text-slate-400',
};
const PLATFORM_CLASS: Record<string, string> = {
  'Trendyol Go': 'bg-orange-100 text-orange-700',
  Yemeksepeti: 'bg-red-100 text-red-700',
  'Her İkisi': 'bg-violet-100 text-violet-700',
};

// ─── Column widths ────────────────────────────────────────────────────────────

const COLUMN_WIDTH: Record<string, number> = {
  name: 192,
  owner: 160,
  status: 112,
  license: 128,
  platform: 128,
  city: 112,
  email: 208,
  phone: 160,
  monthlyOrders: 128,
  createdAt: 128,
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const TENANTS: Tenant[] = [
  {
    id: '1',
    name: 'Lezzet Durağı',
    owner: 'Ahmet Yılmaz',
    status: 'active',
    license: 'active',
    city: 'İstanbul',
    email: 'ahmet@lezzet.com',
    phone: '+90 532 111 2233',
    createdAt: '2024-01-15',
    platform: 'Trendyol Go',
    monthlyOrders: 342,
  },
  {
    id: '2',
    name: 'Çıtır Köşe',
    owner: 'Fatma Demir',
    status: 'active',
    license: 'trial',
    city: 'Ankara',
    email: 'fatma@citir.com',
    phone: '+90 541 222 3344',
    createdAt: '2024-02-20',
    platform: 'Her İkisi',
    monthlyOrders: 87,
  },
  {
    id: '3',
    name: 'Ocakbaşı Sarayı',
    owner: 'Mehmet Kaya',
    status: 'suspended',
    license: 'active',
    city: 'İzmir',
    email: 'mehmet@ocakbasi.com',
    phone: '+90 505 333 4455',
    createdAt: '2023-11-08',
    platform: 'Yemeksepeti',
    monthlyOrders: 0,
  },
  {
    id: '4',
    name: 'Büfe Nokta',
    owner: 'Ayşe Çelik',
    status: 'inactive',
    license: 'expired',
    city: 'Bursa',
    email: 'ayse@bufe.com',
    phone: '+90 553 444 5566',
    createdAt: '2023-08-03',
    platform: 'Trendyol Go',
    monthlyOrders: 0,
  },
  {
    id: '5',
    name: 'Meze Bahçesi',
    owner: 'Ali Şahin',
    status: 'active',
    license: 'active',
    city: 'Antalya',
    email: 'ali@meze.com',
    phone: '+90 544 555 6677',
    createdAt: '2024-03-10',
    platform: 'Her İkisi',
    monthlyOrders: 519,
  },
  {
    id: '6',
    name: 'Pide Evi',
    owner: 'Zeynep Arslan',
    status: 'active',
    license: 'active',
    city: 'İstanbul',
    email: 'zeynep@pide.com',
    phone: '+90 533 666 7788',
    createdAt: '2024-04-05',
    platform: 'Yemeksepeti',
    monthlyOrders: 278,
  },
  {
    id: '7',
    name: 'Mangal Ustası',
    owner: 'Hasan Öztürk',
    status: 'suspended',
    license: 'cancelled',
    city: 'Adana',
    email: 'hasan@mangal.com',
    phone: '+90 506 777 8899',
    createdAt: '2023-09-12',
    platform: 'Trendyol Go',
    monthlyOrders: 0,
  },
  {
    id: '8',
    name: 'Kebap Merkezi',
    owner: 'Elif Yıldız',
    status: 'active',
    license: 'trial',
    city: 'İstanbul',
    email: 'elif@kebap.com',
    phone: '+90 545 888 9900',
    createdAt: '2024-05-01',
    platform: 'Her İkisi',
    monthlyOrders: 143,
  },
  {
    id: '9',
    name: 'Köy Sofrası',
    owner: 'Mustafa Güneş',
    status: 'inactive',
    license: 'expired',
    city: 'Konya',
    email: 'mustafa@koy.com',
    phone: '+90 534 999 0011',
    createdAt: '2023-06-20',
    platform: 'Yemeksepeti',
    monthlyOrders: 0,
  },
  {
    id: '10',
    name: 'Tantuni Sarayı',
    owner: 'Hatice Aydın',
    status: 'active',
    license: 'active',
    city: 'Mersin',
    email: 'hatice@tantuni.com',
    phone: '+90 542 100 2233',
    createdAt: '2024-06-15',
    platform: 'Trendyol Go',
    monthlyOrders: 412,
  },
  {
    id: '11',
    name: 'Lahmacun Dünyası',
    owner: 'İbrahim Çiftçi',
    status: 'active',
    license: 'active',
    city: 'Gaziantep',
    email: 'ibrahim@lahmacun.com',
    phone: '+90 507 200 3344',
    createdAt: '2024-07-01',
    platform: 'Her İkisi',
    monthlyOrders: 634,
  },
  {
    id: '12',
    name: 'Börek Atölyesi',
    owner: 'Selin Kurt',
    status: 'suspended',
    license: 'active',
    city: 'Ankara',
    email: 'selin@borek.com',
    phone: '+90 546 300 4455',
    createdAt: '2023-12-25',
    platform: 'Yemeksepeti',
    monthlyOrders: 0,
  },
  {
    id: '13',
    name: 'Izgara Keyfi',
    owner: 'Bülent Koç',
    status: 'active',
    license: 'trial',
    city: 'İzmir',
    email: 'bulent@izgara.com',
    phone: '+90 535 400 5566',
    createdAt: '2024-08-10',
    platform: 'Trendyol Go',
    monthlyOrders: 201,
  },
  {
    id: '14',
    name: 'Anadolu Mutfağı',
    owner: 'Gülay Erdoğan',
    status: 'inactive',
    license: 'cancelled',
    city: 'Trabzon',
    email: 'gulay@anadolu.com',
    phone: '+90 508 500 6677',
    createdAt: '2023-07-14',
    platform: 'Yemeksepeti',
    monthlyOrders: 0,
  },
  {
    id: '15',
    name: 'Fırın Köşe',
    owner: 'Tuncay Polat',
    status: 'active',
    license: 'active',
    city: 'İstanbul',
    email: 'tuncay@firin.com',
    phone: '+90 547 600 7788',
    createdAt: '2024-09-05',
    platform: 'Trendyol Go',
    monthlyOrders: 389,
  },
  {
    id: '16',
    name: 'Döner Palace',
    owner: 'Cengiz Akın',
    status: 'active',
    license: 'active',
    city: 'İstanbul',
    email: 'cengiz@doner.com',
    phone: '+90 532 700 8899',
    createdAt: '2024-10-12',
    platform: 'Her İkisi',
    monthlyOrders: 756,
  },
  {
    id: '17',
    name: 'Gözleme Hanı',
    owner: 'Raziye Bulut',
    status: 'active',
    license: 'trial',
    city: 'Eskişehir',
    email: 'raziye@gozleme.com',
    phone: '+90 541 800 9900',
    createdAt: '2024-11-01',
    platform: 'Yemeksepeti',
    monthlyOrders: 55,
  },
  {
    id: '18',
    name: 'Sushi House TR',
    owner: 'Kemal Erdoğan',
    status: 'active',
    license: 'active',
    city: 'Ankara',
    email: 'kemal@sushitr.com',
    phone: '+90 505 900 0011',
    createdAt: '2024-11-20',
    platform: 'Trendyol Go',
    monthlyOrders: 298,
  },
  {
    id: '19',
    name: 'Pizza 45',
    owner: 'Nilüfer Yiğit',
    status: 'inactive',
    license: 'expired',
    city: 'İzmir',
    email: 'nilufer@pizza45.com',
    phone: '+90 553 010 1122',
    createdAt: '2023-05-10',
    platform: 'Her İkisi',
    monthlyOrders: 0,
  },
  {
    id: '20',
    name: 'Balık Evi',
    owner: 'Serdar Güler',
    status: 'active',
    license: 'active',
    city: 'İstanbul',
    email: 'serdar@balik.com',
    phone: '+90 544 020 2233',
    createdAt: '2024-12-01',
    platform: 'Yemeksepeti',
    monthlyOrders: 187,
  },
];

const MOCK_NAMES = [
  'Kamil Arı',
  'Seda Nur',
  'Orhan Bey',
  'Leyla Can',
  'Serkan Uç',
];
const MOCK_ROLES = ['Yönetici', 'Kasiyer', 'Garson'];

function getMockUsers(tenant: Tenant) {
  const seed = parseInt(tenant.id);
  const extras = Array.from({ length: seed % 3 }, (_, i) => ({
    name: MOCK_NAMES[(seed + i) % MOCK_NAMES.length],
    role: MOCK_ROLES[i % MOCK_ROLES.length],
    email: `${MOCK_NAMES[(seed + i) % MOCK_NAMES.length].split(' ')[0].toLowerCase()}@tenant.com`,
  }));
  return [
    { name: tenant.owner, role: 'Sahip', email: tenant.email },
    ...extras,
  ];
}

// ─── Expand panel ─────────────────────────────────────────────────────────────

function ExpandPanel({ tenant }: { tenant: Tenant }) {
  const users = useMemo(() => getMockUsers(tenant), [tenant]);
  return (
    <div className="grid grid-cols-2 gap-6 border-t border-slate-200 bg-slate-50 px-6 py-5">
      <div>
        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          İşletme Bilgileri
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {tenant.email}
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {tenant.phone}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {tenant.city}
          </li>
          <li className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {new Date(tenant.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </li>
        </ul>
      </div>
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          <Users className="h-3.5 w-3.5" />
          Kullanıcılar ({users.length})
        </p>
        <ul className="space-y-2">
          {users.map((u, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                {u.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {u.name}
                </p>
                <p className="text-xs text-slate-400">{u.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const globalFilterFn: FilterFn<Tenant> = (row, _id, value: string) => {
  const q = value.toLowerCase();
  const { name, owner, city, email, phone } = row.original;
  return (
    name.toLowerCase().includes(q) ||
    owner.toLowerCase().includes(q) ||
    city.toLowerCase().includes(q) ||
    email.toLowerCase().includes(q) ||
    phone.includes(q)
  );
};

const columns: ColumnDef<Tenant>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'İşletme Adı',
    cell: ({ row: { original: t } }) => (
      <span className="truncate text-sm font-medium text-slate-900">
        {t.name}
      </span>
    ),
  },
  {
    id: 'owner',
    accessorKey: 'owner',
    header: 'Sahip',
    cell: ({ row: { original: t } }) => (
      <span className="truncate text-sm text-slate-600">{t.owner}</span>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Durum',
    cell: ({ row: { original: t } }) => (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[t.status]}`}
      >
        {STATUS_LABEL[t.status]}
      </span>
    ),
  },
  {
    id: 'license',
    accessorKey: 'license',
    header: 'Lisans',
    cell: ({ row: { original: t } }) => (
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${LICENSE_CLASS[t.license]}`}
      >
        {LICENSE_LABEL[t.license]}
      </span>
    ),
  },
  {
    id: 'platform',
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row: { original: t } }) => (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_CLASS[t.platform] ?? 'bg-slate-100 text-slate-500'}`}
      >
        {t.platform}
      </span>
    ),
  },
  {
    id: 'city',
    accessorKey: 'city',
    header: 'Şehir',
    cell: ({ row: { original: t } }) => (
      <span className="text-sm text-slate-500">{t.city}</span>
    ),
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'E-posta',
    cell: ({ row: { original: t } }) => (
      <span className="truncate text-sm text-slate-500">{t.email}</span>
    ),
  },
  {
    id: 'phone',
    accessorKey: 'phone',
    header: 'Telefon',
    cell: ({ row: { original: t } }) => (
      <span className="text-sm text-slate-500 tabular-nums">{t.phone}</span>
    ),
  },
  {
    id: 'monthlyOrders',
    accessorKey: 'monthlyOrders',
    header: 'Aylık Sipariş',
    cell: ({ row: { original: t } }) => (
      <span
        className={`text-sm font-medium tabular-nums ${t.monthlyOrders > 0 ? 'text-slate-700' : 'text-slate-300'}`}
      >
        {t.monthlyOrders > 0 ? t.monthlyOrders.toLocaleString('tr-TR') : '—'}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Kayıt Tarihi',
    cell: ({ row: { original: t } }) => (
      <span className="text-sm text-slate-500 tabular-nums">
        {new Date(t.createdAt).toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-white p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden">
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-bold text-slate-900">Restoranlar</h1>
          <p className="mt-1 text-sm text-slate-500">
            TanStack Table + Framer Motion — filter, sort, column reorder,
            expand &amp; pagination
          </p>
        </div>

        <DataTable
          data={TENANTS}
          columns={columns}
          columnWidths={COLUMN_WIDTH}
          getRowId={(row) => row.id}
          globalFilterFn={globalFilterFn}
          searchPlaceholder="İşletme, sahip, şehir, e-posta..."
          filterTabs={{
            columnId: 'status',
            allLabel: 'Tümü',
            options: [
              { value: 'active', label: 'Aktif' },
              { value: 'suspended', label: 'Askıda' },
              { value: 'inactive', label: 'Pasif' },
            ],
          }}
          renderExpand={(tenant) => <ExpandPanel tenant={tenant} />}
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          totalLabel="restoran"
        />
      </div>
    </main>
  );
}
