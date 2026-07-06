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

  async function addStage(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const name = formData.get('stageName') as string;
    if (!name?.trim()) return;
    const maxOrder = Math.max(...pipeline!.stages.map((s) => s.order), -1);
    await db.stage.create({ data: { pipelineId: pipeline!.id, name: name.trim(), order: maxOrder + 1 } });
    redirect(`/accounts/${params.slug}/pipeline`);
  }

  async function renameStage(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const stageId = formData.get('stageId') as string;
    const name = formData.get('name') as string;
    if (name?.trim()) {
      await db.stage.update({ where: { id: stageId }, data: { name: name.trim() } });
    }
    redirect(`/accounts/${params.slug}/pipeline`);
  }

  async function deleteStage(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const stageId = formData.get('stageId') as string;
    const dealCount = await db.deal.count({ where: { stageId } });
    if (dealCount > 0) {
      throw new Error(`Can't delete a stage with ${dealCount} deal(s) still in it - move them first.`);
    }
    await db.stage.delete({ where: { id: stageId } });
    redirect(`/accounts/${params.slug}/pipeline`);
  }

  async function moveStage(formData: FormData) {
    'use server';
    await assertSubAccountAccess(subAccount.id);
    const stageId = formData.get('stageId') as string;
    const direction = formData.get('direction') as string;
    const stages = pipeline!.stages;
    const idx = stages.findIndex((s) => s.id === stageId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stages.length) return;

    await db.$transaction([
      db.stage.update({ where: { id: stages[idx].id }, data: { order: stages[swapIdx].order } }),
      db.stage.update({ where: { id: stages[swapIdx].id }, data: { order: stages[idx].order } }),
    ]);
    redirect(`/accounts/${params.slug}/pipeline`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide">Pipeline — {subAccount.name}</h1>
        <details className="relative">
          <summary className="cursor-pointer rounded-sm border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide2 hover:border-brass/60">
            Manage Stages
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-80 rounded-sm border border-line bg-panel p-4 shadow-xl">
            <div className="space-y-2">
              {pipeline.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-1">
                  <form action={moveStage}>
                    <input type="hidden" name="stageId" value={stage.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button disabled={i === 0} className="px-1 text-muted hover:text-brass disabled:opacity-20">↑</button>
                  </form>
                  <form action={moveStage}>
                    <input type="hidden" name="stageId" value={stage.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button disabled={i === pipeline.stages.length - 1} className="px-1 text-muted hover:text-brass disabled:opacity-20">↓</button>
                  </form>
                  <form action={renameStage} className="flex flex-1 gap-1">
                    <input type="hidden" name="stageId" value={stage.id} />
                    <input
                      name="name"
                      defaultValue={stage.name}
                      className="w-full rounded-sm border border-line bg-base px-2 py-1 text-xs"
                    />
                    <button className="rounded-sm border border-line px-2 text-[10px] hover:border-brass/60">Save</button>
                  </form>
                  <form action={deleteStage}>
                    <input type="hidden" name="stageId" value={stage.id} />
                    <button className="px-1 text-flag hover:underline text-xs">✕</button>
                  </form>
                </div>
              ))}
            </div>
            <form action={addStage} className="mt-3 flex gap-1 border-t border-line pt-3">
              <input
                name="stageName"
                placeholder="New stage name"
                className="w-full rounded-sm border border-line bg-base px-2 py-1 text-xs"
              />
              <button className="rounded-sm bg-brass px-2 text-[10px] text-base">Add</button>
            </form>
          </div>
        </details>
      </div>

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
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{deal.title}</div>
                    <a
                      href={`/accounts/${params.slug}/deals/${deal.id}/edit`}
                      className="font-mono text-[9px] uppercase tracking-wide2 text-muted hover:text-brass"
                    >
                      Edit
                    </a>
                  </div>
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
