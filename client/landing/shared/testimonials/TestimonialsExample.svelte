<script lang="ts">
  import Testimonials from "@21n/landing/shared/testimonials/Testimonials.svelte";
  import type { ITestimonial } from "@21n/landing/shared/landing.type";

  const testimonials: ITestimonial[] = [
    {
      name: "Sarah Chen",
      body: "This app has completely transformed how I manage my daily tasks. The intuitive interface and smart features have boosted my productivity by at least 30%.",
      source: "linkedin"
    },
    {
      name: "Marcus Rodriguez",
      body: "As a software developer, I've tried countless productivity tools, but this one stands out. The seamless integration with my workflow is exactly what I needed.",
      source: "discord"
    },
    {
      name: "Emily Thompson",
      body: "Finally found an app that actually helps me stay focused! The distraction blocking features are game-changing for my remote work setup.",
      source: "appstore"
    },
    {
      name: "David Kim",
      body: "Been using this for 3 months now and my team's productivity has skyrocketed. The collaborative features are exceptional.",
      source: "x"
    },
    {
      name: "Rachel Foster",
      body: "Love how this app adapts to my work style. The customization options are incredible, and the UI is beautifully designed.",
      source: "producthunt"
    },
    {
      name: "James Wilson",
      body: "The analytics features provide invaluable insights into my productivity patterns. It's helped me optimize my work hours significantly.",
      source: "appstore"
    },
    {
      name: "Priya Patel",
      body: "This is the first productivity app that I've stuck with for more than a month. The habit-building features actually work!",
      source: "discord"
    },
    {
      name: "Michael O'Connor",
      body: "Worth every penny! The time tracking and project management features have helped me deliver projects ahead of schedule.",
      source: "x"
    },
    {
      name: "Lisa Zhang",
      body: "The focus timer and break reminders have dramatically improved my work-life balance. I'm more productive and less stressed.",
      source: "linkedin"
    },
    {
      name: "Alex Morgan",
      body: "As a freelancer, this app has been instrumental in helping me manage multiple clients and projects efficiently. Couldn't recommend it more!",
      source: "producthunt"
    }
  ];
</script>

<Testimonials
  {testimonials}
  title="Join the community"
  subtitle="Discover what our community has to say about their Pointron experience."
/>
