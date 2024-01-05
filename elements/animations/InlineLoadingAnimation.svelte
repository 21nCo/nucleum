<script lang="ts">
import { onMount } from "svelte";
let cssRoot:any;
let divParent:any;
let div:any;
let width:any;
let squareML:any;
let circleMT:any;
let ranOnce:boolean=false;
let r:any;
onMount(()=>{
  cssRoot=document.querySelector(':root');
  div=document.getElementById('InlineDiv');
  divParent=document.getElementById('InlineDiv')?.parentElement;
  r=document.querySelector(':root');
})  
$:if(divParent && !ranOnce){
        ranOnce=true;
        width=divParent.offsetHeight-div.offsetHeight;
        squareML=0-(width/3);
        circleMT=0-(width/9);
        width+='px';
        squareML+='px';
        circleMT+='px';
        cssRoot.style.setProperty('--width',(width));
        cssRoot.style.setProperty('--squareML',squareML);
        cssRoot.style.setProperty('--circleMT',circleMT);
        // let rs = getComputedStyle(r);
        // console.log("--squareML is ",rs.getPropertyValue('--squareML'));
    }
  </script>
<div id="InlineDiv">
     <svg class="square" xmlns="http://www.w3.org/2000/svg" fill="none"></svg>
    <svg class="circle" xmlns="http://www.w3.org/2000/svg" fill="none">
        <circle fill="#333333" />
    </svg>
</div>
<style>
     :root{
        --width:var(--width);
        --height:var(--width);
        --squareML:var(--squareML);
        --circleMT:var(--circleMT);
    }
    div {
        position: relative;
        width: calc(var(--width)*2);
        height:calc(var(--height)/1.5);
    }
    
    .circle {
        position: absolute;
        width:calc(var(--width)/4.5);
        height:calc(var(--height)/4.5);
        margin-top: var(--circleMT);
        top:50%;
    }
    circle{
        cx:calc(var(--width)/10);
        cy:calc(var(--width)/10);
        r:calc(var(--width)/10);
        z-index: 9999;
    }
    .square {
        position: absolute;
        width:calc(var(--width)/1.5);
        height:calc(var(--height)/1.5);
        left: 50%;
        z-index: 999;
        margin-left: var(--squareML);
        border: calc(var(--width)/1.5*(1/24)) solid #333333;
    }

    @keyframes translate {
        0% {
            opacity: 0.05;
        }

        25% {
            opacity: 0.5;
        }

        40% {
            opacity: 1;
        }

        75% {
            opacity: 0.5;
        }

        100% {
            opacity: 0;
            transform: translateX(calc(var(--width)*1.8));
        }
    }

    @keyframes scale {
        0% {
            transform: scale(1, 1);
        }

        10% {
            transform: scale(0.9, 0.9);
        }

        40% {
            transform: scale(1, 1);
        }

        100% {
            transform: scale(1, 1);
        }
    } 

    .circle {
        animation: translate 1s ease infinite;
        animation-fill-mode: backwards;
    }


    .square {
        animation: scale 1s ease 0.25s infinite;
    } 
</style>