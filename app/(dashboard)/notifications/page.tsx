import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NotificationsPage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');

  const notifications = await db.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  async function markRead(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await db.notification.update({ where: { id }, data: { read: true } });
    redirect('/notifications');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Notifications</h1>

      <div className="divide-y divide-line rounded-sm border border-line bg-panel">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-center justify-between p-4 ${n.read ? '' : 'bg-brass/5'}`}>
            <Link href={n.link} className="flex-1 text-sm hover:text-brass">
              {!n.read && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brass" />}
              {n.message}
            </Link>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted whitespace-nowrap">
                {n.createdAt.toLocaleDateString()}
              </span>
              {!n.read && (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="font-mono text-[10px] uppercase tracking-wide2 text-muted hover:text-brass">
                    Mark read
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
