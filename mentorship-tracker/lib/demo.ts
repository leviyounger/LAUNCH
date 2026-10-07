/**
 * Sample rows so the dashboard can be previewed before real submissions exist.
 * Only used when DEMO_DATA=1. Leave it unset in production.
 */
export function demoRows() {
  const weeks = ['2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04'];
  const people = [
    { handle: 'tianathreads',  name: 'Tiana Brooks',  program: 'accelerator', base: 2400, step: 1100, orders: [96, 131, 170, 214], samples: [12, 15, 14, 18], spend: [220, 400, 520, 640], videos: [8, 10, 11, 12], lives: [1, 2, 2, 3] },
    { handle: 'goodvibesgear', name: 'Amanda Clark',  program: 'accelerator', base: 900,  step: 380,  orders: [38, 44, 61, 72],    samples: [4, 6, 9, 11],    spend: [0, 60, 120, 180],   videos: [5, 6, 8, 9],     lives: [0, 0, 1, 1] },
    { handle: 'freedamakes',   name: 'Freeda Nunez',  program: 'accelerator', base: 300,  step: 120,  orders: [9, 12, 12, 17],     samples: [2, 3, 3, 5],     spend: [0, 0, 0, 0],        videos: [2, 3, 3, 4],     lives: [0, 0, 0, 0] },
    { handle: 'marcoprints',   name: 'Marco Diaz',    program: 'academy',     base: 500,  step: 260,  orders: [14, 22, 31, 40],    samples: [3, 5, 6, 8],     spend: [0, 40, 80, 90],     videos: [4, 6, 7, 9],     lives: [0, 1, 1, 2] },
    { handle: 'shopwithjules', name: 'Julia Park',    program: 'academy',     base: 150,  step: 90,   orders: [3, 6, 9, 13],       samples: [1, 2, 2, 4],     spend: [0, 0, 0, 25],       videos: [2, 2, 4, 5],     lives: [0, 0, 0, 1] },
  ];

  let id = 1;
  const rows = [];
  for (const p of people) {
    for (let i = 0; i < weeks.length; i++) {
      const g7 = p.base + p.step * i;
      rows.push({
        id: id++,
        handle: p.handle,
        display_name: p.name,
        program: p.program,
        orders_28: p.orders[i],
        week_ending: weeks[i],
        gmv_7: g7,
        gmv_28: Math.round(g7 * 3.4),
        samples_sent: p.samples[i],
        gmv_max_spend: p.spend[i],
        videos_posted: p.videos[i],
        lives_count: p.lives[i],
        created_at: weeks[i] + 'T12:00:00.000Z',
      });
    }
  }
  return rows;
}
