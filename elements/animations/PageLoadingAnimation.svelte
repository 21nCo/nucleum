<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  let cssRoot:any;
  let width:any
  let margin:any
  onMount(()=>{
    cssRoot=document.querySelector('#pageLoadingAnim');
  })  

  $:if(cssRoot){
    width=$windowObject.documentWidth/10;
    margin=width/2;
    margin=width/2;
    width+='px';
    margin=-margin;
    margin+='px';
    cssRoot.style.setProperty('--width',(width));
    cssRoot.style.setProperty('--margin',(margin));
  }
</script>

<svg id="pageLoadingAnim" xmlns="http://www.w3.org/2000/svg"  fill="none">
    <circle/>
</svg>

<style>
    #pageLoadingAnim{
        --width:var(--width);
        --height:var(--width);
        --margin:var(--margin);
    }
    svg {
        position: fixed;
        width:var(--width);
        height:var(--height);
        left: 50%;
        top: 50%;
        z-index: 9999;
        margin: var(--margin) 0 0 var(--margin);
        border: calc(var(--width)*(1/24)) solid rgba(var(--colors-fgs1), 1);
        border-radius: calc(var(--width)*(1/24));
        box-sizing: content-box;
    }
    circle{
        cx:calc(var(--width)/2);
        cy:calc(var(--width)/2);
        r:calc(var(--width)/4);
        fill:rgba(var(--colors-fgs1), 1);
    }
    @keyframes scale {
        0% {
            r: calc(var(--width)/4);
        }

        50% {
            r: calc(var(--width)/2.1);
        }

        100% {
            r: calc(var(--width)/4);
        }
    }

    @keyframes rotate {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(90deg);
        }
    }

    svg circle {
        animation: scale 1s ease infinite;
    }

    svg {
        animation: rotate 1s ease 0.5s infinite;
    }
</style>