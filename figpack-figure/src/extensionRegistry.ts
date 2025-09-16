export const registeredFPExtensions: {
  name: string;
}[] = [];

export const registerFPExtension = (extension: { name: string }) => {
  for (const e of registeredFPExtensions) {
    if (e.name === extension.name) {
      console.warn(
        `Extension ${extension.name} is already registered. Skipping.`,
      );
      return;
    }
  }
  console.info("Registered extension:", extension.name);
  registeredFPExtensions.push(extension);
};
