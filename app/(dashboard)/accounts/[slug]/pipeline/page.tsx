import { db } from '@/lib/db';
import { assertSubAccountAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';

const DEFAULT_STAGES = ['New Lead', 'Contacted', 'Quoted', 'Won', 'Lost'];

export default async function PipelinePage({ params }: { params: { slug: string } }) {
  const subAccount = await db.subAccount.findUniqueOrThrow({ where: { slug: params.slug } });
  await assertSubAccountAccess(subAccount.id);

  let pipeline = await db.pipeline.findFirst({
    where: { subAccountId: subAccount.id },
    include: { stages: { orderBy: { order: 'asc' }, include: { deals: { include: { contact: true } } } } },
  });

  if (!pipeline) {
    pipeline = await db.pipeline.create({
      data: {
        subAccountId: subAccount.id,
        name: 'Sales Pipeline',
        stages: {
          create: DEFAULT_STAGES.map((name, i) => ({ name, order: i })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' }, include: { deals: { include: { contact: true } } } } },
    });
  }

  async function moveDeal(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const dealId = formData.get('dealId') as string;
    const stageId = formData.get('stageId') as string;
    await db.deal.update({ where: { id: dealId }, data: { stageId } });
    redirect(`/accounts/${params.slug}/pipeline`);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-wide">Pipeline — {subAccount.name}</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => (
          <div key={stage.id} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-sm tracking-wide">{stage.name}</h2>
              <span className="font-mono text-[10px] text-muted">{stage.deals.length}</span>
            </div>
            <div className="space-y-2">
              {stage.deals.map((deal) => (
                <div key={deal.id} className="rounded-sm border border-line bg-panel p-3">
                  <div className="text-sm">{deal.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {deal.contact.firstName} {deal.contact.lastName}
                  </div>
                  {deal.value && (
                    <div className="mt-1 font-mono text-xs text-brass">${deal.value.toString()}</div>
                  )}
                  <form action={moveDeal} className="mt-2">
                    <input type="hidden" name="dealId" value={deal.id} />
                    <select
                      name="stageId"
                      defaultValue={stage.id}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="w-full rounded-sm border border-line bg-base px-2 py-1 font-mono text-[10px] uppercase tracking-wide2"
                    >
                      {pipeline!.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </form>
                </div>
              ))}
              {stage.deals.length === 0 && (
                <p className="rounded-sm border border-dashed border-line p-3 text-center text-xs text-muted">
                  Empty
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
