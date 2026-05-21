## Brand & Style
The brand identity is centered on "Soft Systemic" efficiency—a blend of high-productivity SaaS utility and organic, approachable aesthetics. It targets professional teams who require high-density information (like calendars and agendas) without the cognitive load of traditional, "heavy" enterprise software.

The design style is a sophisticated mix of **Glassmorphism** and **Modern Corporate**. It utilizes semi-transparent surfaces and backdrop blurs to create a sense of breathability and depth. The interface feels light, airy, and "wet," using subtle transitions and scale-based interactions to provide tactile feedback without visual clutter.

## Colors
The palette is dominated by a "Sky Blue" primary color that drives action and highlights current focus areas. The background uses a very light off-white (#f6f7f8) to reduce screen glare compared to pure white. 

We use a "Slate" scale for typography and borders to maintain a softer contrast than pure black. Specific semantic colors, such as the muted purple for offsite events, should remain desaturated and high-lightness to ensure they don't break the airy aesthetic. The "Glass" effect is achieved using a white base with 65% opacity and a heavy 16px blur.

## Typography
We use **Outfit** across all levels to leverage its geometric clarity and modern, friendly character. 

- **Headlines** use tight tracking and bold weights to anchor the layout.
- **Body** text is primarily 14px for optimal density in data-heavy views.
- **Metadata/Labels** utilize uppercase styling with increased letter spacing to create clear section breaks (e.g., calendar day headers).
- **Interactive Labels** (buttons/pills) use a 14px bold weight to ensure legibility against colored backgrounds.

## Layout & Spacing
The system uses a **Mixed-Pane Layout**. The primary content (Calendar) occupies a fluid area with a minimum 40px (2.5rem) internal padding, while the Sidebar (Agenda) is fixed at 320px width.

The calendar follows a rigid 7-column grid with 1px gutters (the "border-collapse" look), allowing the background color to bleed through as grid lines. Content within cells uses a 8px (0.5rem) padding. On mobile devices, the sidebar should transform into a bottom sheet, and the 7-column grid should allow horizontal scrolling or switch to a vertical stack.

## Elevation & Depth
Depth is created through **Subtlety and Transparency** rather than heavy shadows.

- **Level 0 (Surface):** The main background (#f6f7f8).
- **Level 1 (Sheet):** Calendar cells and primary buttons. Use `shadow-sm` (a very light 1-2px blur) to lift items slightly.
- **Level 2 (Glass):** The Sidebar. This uses `backdrop-filter: blur(16px)` and a semi-transparent white background to appear as if it is floating above the main content.
- **Interactive Depth:** When hovering over event pills or agenda items, use a subtle scale-up (1.02x) and a soft, diffused shadow (`0 16px 48px rgba(44, 62, 80, 0.08)`) to indicate "pick-up" state.

## Shapes
The shape language is "Generously Rounded." 

- **Standard Containers:** Use 0.5rem (8px) for small items like event pills.
- **Large Containers:** Use 1rem (16px) for sidebar cards and the main calendar grid container.
- **Interactive Elements:** Buttons and navigation controls use 0.75rem (12px) to 1.5rem (24px) to emphasize touch-friendliness.
- **Date Markers:** Today's date indicator is a perfect circle (full radius) to act as a high-contrast focal point.

## Components

### Buttons
- **Primary:** Solid #2b93ee background, white text, 12px rounded corners. Height: 40px (standard) or 48px (prominent).
- **Ghost/Secondary:** Slate-100 background that darkens on hover. No border, or a very light Slate-200 border.

### Event Pills
Small, high-density indicators. Height: 24px. Use a subtle border (10% darker than the background) and 8px rounded corners. Text should be 12px bold.

### Calendar Cells
Fixed-aspect or fluid containers. Use a "hover:bg-slate-50" transition to give the user a sense of "slot" availability. Align date numbers to the top right in a muted slate color.

### Agenda Items
Transparent-base buttons with 12px rounding. On hover, they should transition to a white/80 glass effect. This reinforces the systemic depth of the sidebar.

### Input Fields (Conceptual)
Should follow the button styling: 12px rounded, light slate backgrounds, and a 2px blue outline only on focus to maintain the clean look.
