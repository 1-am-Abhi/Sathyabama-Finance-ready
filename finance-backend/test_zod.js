const { z } = require('zod');

const schema = z.object({
  body: z.object({
    password: z.string().min(8)
  })
});

try {
  schema.parse({ body: { password: '123' }});
} catch (error) {
  console.log('Is ZodError:', error instanceof z.ZodError);
  console.log('Has .errors:', !!error.errors);
  console.log('Has .issues:', !!error.issues);
  console.log('Type of .errors:', typeof error.errors);
  if (!error.errors) {
      console.log('Cannot read properties of undefined (reading \'map\') will happen here!');
  }
}
