/* Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint node:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true */

/*
 * This modules consists of common code factored out of:
 *      npm: verify-bucket-md5
 *      npm: verify-fsdir-md5
 * 
 * which were subsequently refactored to depend on this module
 *
 */

function FileVerificationError(obj){
    if (obj.actual===obj.expected)
	throw new Error("Bug: actual===expected, but throwing an error?");
    this.name = "FileVerificationError";
    this.message = "File Verification Error on file: "+obj.file+" : expected: "+obj.expected+" actual: "+obj.actual;
    this.stack = (new Error()).stack;
    this.actual = obj.actual;
    this.expected = obj.expected;
    if (obj.file) this.file = obj.file;
    if (obj.prefix) this.prefix = obj.prefix.toString();
}

FileVerificationError.prototype = Object.create(Error.prototype);
FileVerificationError.prototype.constructor = FileVerificationError;

module.exports = function verifyFactory({
    promiseChecklistBuffer,
    promiseActual,
    getBaseName,
    getPrefix,
    fastFail
}){
    return function(pathToCheckfile, options){
	const err = {};
	const prefix = getPrefix(pathToCheckfile);
	const status = [false, [], [], err, prefix.toString()];
	(promiseChecklistBuffer(pathToCheckfile, options)
	 .then((buffer)=>(buffer.toString('utf8')))
	 .then((jsonstring)=>(JSON.parse(jsonstring)))
	 .then((checkJSON)=>{
	     function promiseCompare(f){
		 return (promiseActual(prefix,f,options)
			 .then( (actual)=> {
			     const expected = checkJSON[f];
			     if (actual===expected){
				 status[1].push(f);
				 return true;
			     } else {
				 throw new FileVerificationError({expected, actual, prefix, file: f});
			     }
			 })
			 .catch( (e)=>{
			     if (fastFail) throw e;
			     else {
				 err[f] = e;
				 status[2].push(f);
			     }
			 })
			     );
	     } // ends inner function promiseCompare(f)
	     const files = Object.keys(checkJSON).sort().map(getBaseName);
	     const promises = files.map(promiseCompare);
	     return (Promise
		     .all(promises)
		     .then(()=>{
			 status[0]=(status[1].length===files.length);
			 return status;
		     })
		    );
	 })
	);
    };
};
