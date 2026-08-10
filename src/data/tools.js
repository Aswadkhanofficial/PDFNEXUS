import { Combine, Scissors, Minimize2, RotateCw, Stamp, Layers, FileImage, PenLine } from 'lucide-react';

export const TOOLS = [
  {
    slug: 'merge',
    name: 'Merge PDF',
    blurb: 'Combine multiple PDFs into one clean, ordered document in seconds.',
    icon: Combine,
    gradient: 'from-violet-600 to-indigo-500',
  },
  {
    slug: 'split',
    name: 'Split PDF',
    blurb: 'Extract single pages or ranges into separate, ready-to-share files.',
    icon: Scissors,
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    slug: 'compress',
    name: 'Compress PDF',
    blurb: 'Shrink file size dramatically without sacrificing visible quality.',
    icon: Minimize2,
    gradient: 'from-fuchsia-500 to-purple-500',
  },
  {
    slug: 'rotate',
    name: 'Rotate PDF',
    blurb: 'Fix page orientation with precise, one-click 90° turns.',
    icon: RotateCw,
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    slug: 'watermark',
    name: 'Watermark PDF',
    blurb: 'Stamp text or image watermarks across every page of your document.',
    icon: Stamp,
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    slug: 'reorder',
    name: 'Reorder Pages',
    blurb: 'Drag pages into the exact order you need, then export instantly.',
    icon: Layers,
    gradient: 'from-violet-600 to-fuchsia-500',
  },
  {
    slug: 'image-to-pdf',
    name: 'Image to PDF',
    blurb: 'Turn JPG, PNG or WebP images into a single polished PDF.',
    icon: FileImage,
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    slug: 'sign',
    name: 'E-Sign',
    blurb: 'Draw or type a signature and sign documents entirely in-browser.',
    icon: PenLine,
    gradient: 'from-fuchsia-500 to-indigo-500',
  },
].map((tool) => ({ ...tool, path: `/tools/${tool.slug}` }));
