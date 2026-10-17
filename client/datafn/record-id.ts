/** Creates a resource-prefixed identifier for the DataFn runtime. */
export const generateDatafnId = ({
  resource,
  idPrefix
}: {
  resource: string;
  idPrefix?: string;
}) => {
  const prefix = idPrefix || resource;
  return `${prefix}:${crypto.randomUUID()}`;
};
