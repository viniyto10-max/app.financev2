import { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const menuItems = ['Dashboard', 'Categorias', 'Lançamentos', 'Novo Lançamento', 'Configurações'];
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50">
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 transition-all duration-300`}>
        <div className="flex justify-between items-center mb-6">
            {!collapsed && <h1 className="text-xl font-bold">Minha Vida Financeira</h1>}
            <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                {collapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
            </button>
        </div>
        <nav className="space-y-2">
          {menuItems.map(item => <div key={item} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer truncate">{!collapsed && item}</div>)}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
