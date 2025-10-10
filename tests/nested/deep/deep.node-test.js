export default {
  'deeply nested test should be found': ({ pass, fail }) => {
		if(1 == true){
			pass('This test is in a deeply nested subdirectory');
		} else {
			fail('How did this happen?');
		}
  }
};