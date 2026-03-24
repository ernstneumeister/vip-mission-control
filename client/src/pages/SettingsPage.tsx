import { useState, useRef } from 'react';

const defaults = { name: 'Admin', title: 'Chief of Agents', avatarUrl: '', emoji: '🎯' };

function setFavicon(emoji: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.font = '52px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 36);
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
  link.type = 'image/png';
  link.rel = 'icon';
  link.href = canvas.toDataURL();
  document.head.appendChild(link);
}

function loadSettings() {
  try {
    const stored = localStorage.getItem('mc-user-settings');
    return stored ? { ...defaults, ...JSON.parse(stored) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((s: typeof defaults) => ({ ...s, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem('mc-user-settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('mc-settings-updated'));
    setFavicon(settings.emoji || '🎯');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto py-6 md:py-12 px-4 md:px-6">
      <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-20 h-20 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors cursor-pointer bg-muted flex items-center justify-center"
          title="Click to upload avatar"
        >
          {settings.avatarUrl ? (
            <img src={settings.avatarUrl} alt={settings.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🏄</span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <span className="text-xs text-muted-foreground mt-2">Click to change avatar</span>
      </div>

      {/* Emoji */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">Dashboard Emoji</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={settings.emoji}
            onChange={(e) => {
              // Only keep the last entered emoji/character
              const val = e.target.value;
              const emoji = [...val].pop() || '🎯';
              setSettings((s: typeof defaults) => ({ ...s, emoji }));
            }}
            className="w-16 px-3 py-2 rounded-md border border-border bg-background text-foreground text-2xl text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="🎯"
          />
          <span className="text-xs text-muted-foreground">Wird oben links in der Sidebar und als Browser-Favicon angezeigt</span>
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => setSettings((s: typeof defaults) => ({ ...s, name: e.target.value }))}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Admin"
        />
      </div>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
        <input
          type="text"
          value={settings.title}
          onChange={(e) => setSettings((s: typeof defaults) => ({ ...s, title: e.target.value }))}
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Chief of Agents"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {saved ? '✓ Saved' : 'Save'}
      </button>
    </div>
  );
}
