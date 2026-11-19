export const flowers = ['Roses', 'Tulips', 'Peonies', 'Lilies'] as const;
export const colors = {
  Pink:'#ed8eac', Red:'#d72849', White:'#fff5e8', Purple:'#a37ad5', Blue:'#5478dc',
  Yellow:'#ffd151', Orange:'#fa8a45', 'Light Blue':'#91cffa', Green:'#a2c76c', Burgundy:'#812449',
};
export const sizes = ['Small & Cute','Medium & Lovely','Big & Fluffy','Surprise Me!'] as const;
export const decorations = ['A Little Teddy Bear','A Ribbon','A Love Note','A Tiny Heart'] as const;
export const note = "Bouquet for one cute girl who denies that she's cute <3";
export const counts = [5,9,15] as const;
export type Answers = {
  flower: typeof flowers[number]; color: keyof typeof colors;
  size: typeof sizes[number]; decoration: typeof decorations[number]; message: string;
};
export type Config = Omit<Answers,'message'|'size'> & {count: typeof counts[number]; seed: number};
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function valid(a: unknown): a is Answers {
  if (!a || typeof a !== 'object') return false;
  const x = a as Answers;
  return flowers.includes(x.flower) && Object.hasOwn(colors, x.color) && sizes.includes(x.size) &&
    decorations.includes(x.decoration) && typeof x.message === 'string' && x.message.length <= 1000 && !x.message.includes('\0');
}
export function configure(a: Answers, id: string): Config {
  const seed = Number.parseInt(id.slice(0,8),16);
  const index = sizes.indexOf(a.size);
  return {flower:a.flower,color:a.color,decoration:a.decoration,count:counts[index === 3 ? seed % 3 : index],seed};
}
