define function fn::memotron::searchLinks($searchString: string){
    let $nodes = select id, title, title as label from node where string::lowercase(title) CONTAINS $searchString and (isArchived is false or isArchived is none);
    let $collections = select id,title, title as label from collection where string::lowercase(title) CONTAINS $searchString and (isArchived is false or isArchived is none);
    return array::concat($nodes, $collections);
};