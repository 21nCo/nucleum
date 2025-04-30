<script lang="ts">
  import CollapsibleList from "./CollapsibleList.svelte";

  // Example data
  const faqItems = [
    {
      title: "Who owns pointron",
      body: "We immensely value your data as much as you do. Therefore we prioritized building interoperability features on our roadmap. Even if Memotron doesn't exist in 10 years down the line, you will still have access to all the your data safely exported or backed up on to your personal cloud."
    },
    {
      title: "What happens to my data if pointron is shutdown for some reason?",
      body: "We immensely value your data as much as you do. Therefore we prioritized building interoperability features on our roadmap. Even if Memotron doesn't exist in 10 years down the line, you will still have access to all the your data safely exported or backed up on to your personal cloud."
    },
    {
      title: "Why did you guys name it pointron?",
      body: "The name 'pointron' was inspired by our mission to create a tool that helps users point to and connect with their important information quickly and efficiently, combining 'point' with the suffix 'tron' which evokes technology and automation."
    },
    {
      title: "What does the circle in the logo represent?",
      body: "The circle in our logo represents continuity, wholeness, and the cyclical nature of knowledge management. It symbolizes how pointron helps bring all your information into a complete, interconnected system."
    }
  ];
</script>

<div class="p-8 min-h-screen">
  <CollapsibleList items={faqItems} />
</div>
