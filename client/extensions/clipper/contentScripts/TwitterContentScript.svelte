<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  export let id: string;

  function findAncestorOrSelf(element, selector) {
    if (element.matches(selector)) {
      return element;
    }
    let currentElement = element;
    while (currentElement) {
      if (
        currentElement.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
        currentElement.host
      ) {
        currentElement = currentElement.host;
      } else {
        currentElement = currentElement.parentNode;
      }
      if (!currentElement || currentElement === document) {
        return null;
      }
      if (currentElement.matches && currentElement.matches(selector)) {
        return currentElement;
      }
    }
    return null;
  }

  function parseTweetContent(tweetArticle: Element) {
    console.log({ tweetArticle });
    if (!tweetArticle) return;

    const tweetBody = tweetArticle.querySelector('[data-testid="tweetText"]');
    const linkElements = tweetArticle.querySelectorAll("a");
    const timeElements = tweetArticle.querySelectorAll("time");

    let tweetContent = tweetBody
      ? tweetBody.textContent
      : "No tweet content found";
    let tweetLinks = Array.from(linkElements).map((link) => ({
      text: link.textContent,
      href: link.getAttribute("href")
    }));
    let tweetTime = Array.from(timeElements).map((time) => {
      return {
        text: time.textContent,
        datetime: time.getAttribute("datetime")
      };
    });
    console.log({ tweetContent, tweetLinks, tweetTime });
  }

  function findTweetArticle(element) {
    return findAncestorOrSelf(element, 'article[data-testid="tweet"]');
  }

  function onClick(event) {
    const tweetArticle = findTweetArticle(event.target);
    if (tweetArticle) {
      console.log("Found tweet article:", tweetArticle);
      parseTweetContent(tweetArticle);
    } else {
      console.log("Tweet article not found");
    }
  }
</script>

<!-- <button on:click={onClick}>Click me</button> -->
<button class="p-1 rounded-md mr-2 mt--2" on:click|stopPropagation={onClick}>
  <Button icon="plus" tooltip="Save to Memotron" />
  <!-- <Icon icon="plus" /> -->
</button>
