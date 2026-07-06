import { db } from '@/lib/db';
import { getCurrentUserContext } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function ProfilePage() {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect('/sign-in');

  async function saveProfile(formData: FormData) {
    'use server';
    await db.user.update({
      where: { id: ctx!.user.id },
      data: {
        avatarUrl: (formData.get('avatarUrl') as string) || null,
        signOffName: (formData.get('signOffName') as string) || null,
        signOffTitle: (formData.get('signOffTitle') as string) || null,
      },
    });
    redirect('/agency/profile');
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Your Profile</h1>

      <div className="flex items-center gap-4">
        {ctx.user.avatarUrl ? (
          <Image
            src={ctx.user.avatarUrl}
            alt={ctx.user.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover border border-line"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-panel font-display text-xl text-muted">
            {ctx.user.name.charAt(0)}
          </div>
        )}
        <div>
          <div className="font-display text-lg">{ctx.user.name}</div>
          <div className="text-xs text-muted">{ctx.user.email}</div>
        </div>
      </div>

      <form action={saveProfile} className="space-y-4 rounded-sm border border-line bg-panel p-5">
        <Field
          label="Photo URL"
          name="avatarUrl"
          defaultValue={ctx.user.avatarUrl || ''}
          placeholder="https://..."
        />
        <p className="-mt-2 text-xs text-muted">
          Direct photo upload is coming - for now, paste a link to a hosted photo (Google Photos,
          Imgur, etc. share link).
        </p>
        <Field
          label="Email sign-off name"
          name="signOffName"
          defaultValue={ctx.user.signOffName || ''}
          placeholder={ctx.user.name}
        />
        <Field
          label="Title (shown under your name in emails)"
          name="signOffTitle"
          defaultValue={ctx.user.signOffTitle || ''}
          placeholder="Sales"
        />
        <button className="rounded-sm bg-brass px-4 py-2 font-display text-sm tracking-wide text-base">
          Save
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide2 text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-line bg-base px-3 py-2 text-sm"
      />
    </label>
  );
}
