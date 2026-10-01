<script lang="ts">
  export let name = 'compass';
  export let size = 22;
  const paths: Record<string, string> = {
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M16 8l-2 6-6 2 2-6 6-2Z',
    people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M7 7h.01 M17 7h.01 M12 12h.01 M7 17h.01 M17 17h.01',
    sword: 'm14 3 7 0 0 7-12 12-7-7L14 3Z M14 3l7 7 M3 21l4-4 M2 14l8 8',
    book: 'M12 5v16 M12 5C9 2 4 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-7-2-10 1Z',
    shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z M9 12l2 2 4-4',
    plus: 'M12 5v14 M5 12h14',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z M16 16l5 5',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    leaf: 'M20 3c0 12-3 17-10 17a7 7 0 0 1-7-7C3 6 10 3 20 3Z M3 21 15 9'
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.compass} /></svg>
