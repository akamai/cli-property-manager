{
    const errors = require("./errors");
    var context;
}

start = items:( expression / regular_text )+ {
    if (items.length > 1) {
        return items.join('')
    } else if (items.length === 1) {
        return items[0]
    } else {
        return "";
    }
}

regular_text = text:regular_text_item+ {
    return text.join('');
}

regular_text_item = item:(!start_exp (start_esc_exp / .) ) { return item[1]; }

start_esc_exp = "\\" start_exp:start_exp { return start_exp; }

expression = start:start_exp exp:var_exp end:end_exp {return context.finalValue();}

start_exp = '${'

var_exp = dotless_exp (access_exp)* {return context;}

end_exp = '}'

dotless_exp = name:var_name { context = options.context.get(name); return context; }

access_exp = dot_exp / bracket_exp {return context;}

dot_exp = '.' name:var_name {
    context = context.get(name);
    return context;
}

bracket_exp = '[' number:number ']' {
    context = context.get(number);
    return context;
}

number = digits:[0-9]* { return digits.join(''); }

var_name = start:[a-zA-Z_] letters:[a-zA-Z0-9_]* { return start + letters.join(''); }