import ThemeToggle from '../components/common/ThemeToggle';

export default function Categorias() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] pb-32">
      <header className="py-3 px-5 flex justify-between items-center" style={{ background: 'var(--header-gradient)' }}>
        <h1 className="text-lg font-bold text-white">Categorias</h1>
        <ThemeToggle />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[var(--text-secondary)]">Tela de Categorias em construção.</p>
      </div>
    </div>
  );
}
